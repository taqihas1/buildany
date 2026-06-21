import os

os.chdir('/Users/taqihasan/carbuyassistantgithub/Carbuyingassistant')

with open('src/screens/CarSearchScreen.tsx', 'r') as f:
    content = f.read()

# Replace all << with < (for TypeScript generics)
content = content.replace('<<', '<')

with open('src/screens/CarSearchScreen.tsx', 'w') as f:
    f.write(content)

print('Fixed all << to < in generics.')
