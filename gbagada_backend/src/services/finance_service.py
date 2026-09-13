from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException, status

from src.models.finance import Finance, TransactionType, TransactionStatus
from src.models.user import User, UserRole
from src.services.notification_service import NotificationService

class FinanceService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)
    
    def create_transaction(self, transaction_data, current_user):
        """Record a transaction (Admin A)"""
        if current_user.role not in [UserRole.ADMIN, UserRole.OVERALL_PASTOR, UserRole.SUPER_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can record transactions"
            )
        
        # For expenses, require approval
        if transaction_data.transaction_type == TransactionType.EXPENSE:
            transaction = Finance(
                **transaction_data.dict(),
                recorded_by_id=current_user.id,
                status=TransactionStatus.PENDING
            )
            self.db.add(transaction)
            self.db.commit()
            self.db.refresh(transaction)
            
            # Notify pastor for approval
            pastors = self.db.query(User).filter(
                User.role.in_([UserRole.PASTOR, UserRole.OVERALL_PASTOR])
            ).all()
            for pastor in pastors:
                self.notification_service.send_finance_approval_request.delay(
                    current_user.id,
                    pastor.id,
                    transaction_data.amount,
                    transaction_data.description
                )
            
            return transaction
        else:
            # For income, requires confirmation by another admin
            transaction = Finance(
                **transaction_data.dict(),
                recorded_by_id=current_user.id,
                status=TransactionStatus.PENDING
            )
            self.db.add(transaction)
            self.db.commit()
            self.db.refresh(transaction)
            return transaction
    
    def confirm_transaction(self, transaction_id: int, current_user):
        """Confirm a transaction (Admin B)"""
        if current_user.role not in [UserRole.ADMIN, UserRole.OVERALL_PASTOR, UserRole.SUPER_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can confirm transactions"
            )
        
        transaction = self.db.query(Finance).filter(Finance.id == transaction_id).first()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        
        if transaction.recorded_by_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot confirm your own transaction"
            )
        
        if transaction.status == TransactionStatus.CONFIRMED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Transaction is already confirmed"
            )
        
        transaction.confirmed_by_id = current_user.id
        transaction.confirmed_at = datetime.now()
        transaction.status = TransactionStatus.CONFIRMED
        
        self.db.commit()
        self.db.refresh(transaction)
        return transaction
    
    def approve_expense(self, transaction_id: int, current_user):
        """Approve an expense (Pastor)"""
        if current_user.role not in [UserRole.PASTOR, UserRole.OVERALL_PASTOR, UserRole.SUPER_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only pastors can approve expenses"
            )

        transaction = self.db.query(Finance).filter(
            and_(
                Finance.id == transaction_id,
                Finance.transaction_type == TransactionType.EXPENSE,
                Finance.status == TransactionStatus.PENDING
            )
        ).first()
        
        if not transaction:
            raise HTTPException(
                status_code=404,
                detail="Pending expense not found"
            )
        
        transaction.approved_by_id = current_user.id
        transaction.approved_at = datetime.now()
        transaction.status = TransactionStatus.APPROVED
        
        self.db.commit()
        self.db.refresh(transaction)
        
        # Notify the admin who requested
        self.notification_service.send_notification_to_workers.delay(
            "Expense Approved",
            f"Your expense of ₦{transaction.amount:,.2f} for {transaction.description} has been approved.",
            current_user.id
        )
        
        return transaction
    
    def get_financial_summary(self, start_date: Optional[datetime] = None, 
                              end_date: Optional[datetime] = None):
        """Get financial summary for reporting — now also returns a
        by_category breakdown, additive alongside the existing totals."""
        query = self.db.query(Finance)
        
        if start_date:
            query = query.filter(Finance.date >= start_date)
        if end_date:
            query = query.filter(Finance.date <= end_date)
        
        transactions = query.all()

        income_types = [
            TransactionType.OFFERING, TransactionType.TITHE,
            TransactionType.FIRST_FRUITS, TransactionType.GIFT,
            TransactionType.DONATION
        ]
        
        total_income = sum(
            t.amount for t in transactions 
            if t.transaction_type in income_types
            and t.status == TransactionStatus.CONFIRMED
        )
        
        total_expenses = sum(
            t.amount for t in transactions 
            if t.transaction_type == TransactionType.EXPENSE
            and t.status == TransactionStatus.APPROVED
        )

        # Breakdown by category — same status rules as the totals above
        # (each income type only counts once confirmed, expense only
        # once approved). Fund requests (TransactionType.REQUEST) are
        # deliberately excluded here too, same as in the totals — a
        # request is a pending intention to spend, not a recorded
        # transaction yet.
        by_category = {}
        for income_type in income_types:
            amount = sum(
                t.amount for t in transactions
                if t.transaction_type == income_type
                and t.status == TransactionStatus.CONFIRMED
            )
            by_category[income_type.value] = float(amount)

        by_category[TransactionType.EXPENSE.value] = float(total_expenses)

        # Pending visibility — recorded but not yet confirmed/approved,
        # so it's never counted in the official totals above, but an
        # admin should still be able to see it exists rather than the
        # report just looking empty.
        pending_income = sum(
            t.amount for t in transactions
            if t.transaction_type in income_types
            and t.status == TransactionStatus.PENDING
        )
        pending_expenses = sum(
            t.amount for t in transactions
            if t.transaction_type == TransactionType.EXPENSE
            and t.status == TransactionStatus.PENDING
        )
        
        return {
            "total_income": float(total_income),
            "total_expenses": float(total_expenses),
            "balance": float(total_income - total_expenses),
            "transaction_count": len(transactions),
            "by_category": by_category,
            "pending_income": float(pending_income),
            "pending_expenses": float(pending_expenses),
        }