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
    return render_template("index.html", clientId="test")

@app.route('/<client_id>')
def user(client_id):
    return render_template("index.html", clientId=client_id)

if __name__ == '__main__':
    print(f"Running server on port {PORT}")
    app.run('0.0.0.0', port=PORT)
