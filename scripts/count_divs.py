import sys
with open(sys.argv[1]) as f:
    lines = f.readlines()
depth = 0
in_return = False
for i, line in enumerate(lines):
    if 'return (' in line and 'flex flex-col' in line:
        in_return = True
    if not in_return:
        continue
    opens = line.count('<div ') + line.count('<div>') + line.count('<button ') + line.count('<button>')
    closes = line.count('</div>') + line.count('</button>')
    depth += opens - closes
    print(f'{i+1}: d={depth}  {line.rstrip()[:100]}')
