# Standard library
import os
import sys
import time
import json

# Flask
from flask import Flask, render_template

PORT = 7999
DEBUG = False

# Initialize server
app = Flask(__name__, static_folder = 'templates', static_url_path='/')

app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['DEBUG'] = DEBUG

@app.route('/')
def index():
    return render_template("index.html")

if __name__ == '__main__':
    print(f"Running server on port {PORT}")
    app.run(port=PORT)
