// Church information constants
export const CHURCH_INFO = {
  name: 'Dominion City Gbagada',
  phone: '+234-XXX-XXX-XXXX',
  email: 'info@dominioncitygbagada.com',
  address: 'Gbagada, Lagos, Nigeria',
  website: 'https://dominioncitygbagada.com',
  socialMedia: {
    facebook: 'https://facebook.com/dominioncitygbagada',
    instagram: 'https://instagram.com/dominioncitygbagada',
    youtube: 'https://youtube.com/dominioncitygbagada',
    twitter: 'https://twitter.com/dominioncitygbagada',
  }
};

// Service times
export const SERVICE_TIMES = {
  sunday: [
    { name: 'First Service', time: '9:00 AM' },
    { name: 'Second Service', time: '11:00 AM' }
  ],
  tuesday: [
    { name: 'Prayer Meeting', time: '6:00 PM' }
  ]
};

// User roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  PASTOR: 'pastor',
  ADMIN: 'admin',
  DEPARTMENT_HEAD: 'department_head',
  CELL_LEADER: 'cell_leader',
  MEMBER: 'member'
};

// Transaction types
export const TRANSACTION_TYPES = {
  OFFERING: 'offering',
  TITHE: 'tithe',
  FIRST_FRUITS: 'first_fruits',
  GIFT: 'gift',
  DONATION: 'donation',
  EXPENSE: 'expense'
};

// Announcement types
export const ANNOUNCEMENT_TYPES = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  WORKERS_ONLY: 'workers_only'
};