#!/usr/bin/python3
import sys, os, glob
from jsmin import jsmin

sum_text = ''
for filename in os.listdir('static'):
    if not filename.endswith(".js") or filename == "fbd.min.js":
        continue
    with open('static/'+filename, 'r') as js_file:
        sum_text += js_file.read()
sum_text = jsmin.jsmin(sum_text).replace('\n', '')
sum_text = """
/* Copyright (C) 2017 (license)
 * Andrew Janke, Dennis Chang, Lious Boehm, Adithya Ramanathan
 * Readable source code available at --- */
""" + sum_text + '\n'
sys.stdout.write(sum_text)


