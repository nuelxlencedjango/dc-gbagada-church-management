import platform
print(platform.system())

print("*" * 50)
print(dir(platform))

import platform

# See all available methods inside the platform module
print(dir(platform))

# Fetch and display laptop details
info = platform.uname()
print(f"Operating System: {info.system}")
print(f"OS Release:       {info.release}")
print(f"OS Version:       {info.version}")
print(f"Laptop Name:      {info.node}")
print(f"Architecture:     {info.machine}")
print(f"Processor:        {info.processor}")
print(platform.processor())
print(platform.architecture())
print(platform.node())


fruits = ['mango','apple','grape','cashew', 'orange']
no_fruits =len(fruits) -1
end = 0
while no_fruits > end:
    print(fruits[no_fruits])
    no_fruits -= 1



def list_nums(n):

    return [x for x in n if x % 2 == 0]

nums = [8,2,3,1,5,6,8,9,15]

print(list_nums(nums))