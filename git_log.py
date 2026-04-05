import os

with open('git_log_utf8.txt', 'w', encoding='utf-8') as f:
    out = os.popen('git log --oneline -n 15').read()
    f.write(out)
