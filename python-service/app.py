from flask import Flask, jsonify
from dotenv import load_dotenv
import os

from routes.verify_employment import verify_employment_bp

load_dotenv()

app = Flask(__name__)

# Register blueprints
app.register_blueprint(verify_employment_bp)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'creditflow-python-service'}), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)