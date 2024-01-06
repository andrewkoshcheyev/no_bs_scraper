import requests
import json
from bs4 import BeautifulSoup
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global list to store received selectors
received_selectors = []

# File where templates will be stored
TEMPLATE_FILE = 'templates.json'

@app.route('/')
def index():
    # Renders the home page with the form
    return render_template('index.html')

@app.route('/receive_data', methods=['POST'])
def receive_data():
    data = request.json
    received_selectors.append(data)
    return jsonify({"status": "success"})

@app.route('/get_data', methods=['GET'])
def get_data():
    return jsonify(received_selectors)

@app.route('/scrape_data', methods=['GET'])
def scrape_data():
    scraped_data = {}
    for item in received_selectors:
        url = item['url']
        selector = item['selector']
        # Use the selector to scrape data from the URL
        scraped_data[url] = scrape_using_selector(url, selector)
    return jsonify(scraped_data)

@app.route('/store_template', methods=['POST'])
def store_template():
    data = request.json
    new_template = data.get('template', [])  # Get the template, default to empty list if not found

    if not new_template:  # Check if the new template is empty
        return jsonify({"status": "error", "message": "No data in template."})

    try:
        if os.path.isfile(TEMPLATE_FILE):
            with open(TEMPLATE_FILE, 'r') as file:
                templates = json.load(file)
        else:
            templates = []
    except json.JSONDecodeError:
        templates = []

    templates.append(new_template)

    with open(TEMPLATE_FILE, 'w') as file:
        json.dump(templates, file, indent=4)

    return jsonify({"status": "success", "message": "Template stored successfully."})


def scrape_using_selector(url, selector):
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')

    if selector.startswith('#'):
        # If selector is an ID
        element = soup.find(id=selector[1:])
    elif selector.startswith('.'):
        # If selector is a class
        element = soup.find(class_=selector[1:].replace('.', ' '))
    else:
        # If selector is an XPath
        element = soup.select_one(selector) # This needs a proper CSS selector, not XPath

    return element.get_text() if element else 'Not found'

if __name__ == '__main__':
    app.run(debug=True)
