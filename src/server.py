# Standard library
import os
import sys
import time
import json

# Flask
from flask import Flask, render_template

ADDRESS = 'localhost'
PORT = 8192
DEBUG = True

# Initialize server
app = Flask(__name__, static_folder = 'templates', static_url_path='/')

app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
app.config['DEBUG'] = DEBUG

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/user/<client_id>')
def user(client_id):
    return render_template("index.html", clientId=client_id)

@app.route('/serviceworker.js')
def serviceworker():
    return app.send_static_file('serviceworker.js')

if __name__ == '__main__':
    print(f"Running server on port {PORT}")
    app.run(ADDRESS, port=PORT)
