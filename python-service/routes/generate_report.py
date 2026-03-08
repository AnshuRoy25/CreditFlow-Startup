from flask import Blueprint, request, jsonify
import os
import random

generate_report_bp = Blueprint('generate_report', __name__)

INTERNAL_SECRET = os.environ.get('INTERNAL_SECRET', 'dev-secret')


def check_internal_secret(req):
    return req.headers.get('X-Internal-Secret') == INTERNAL_SECRET


@generate_report_bp.route('/generate-report', methods=['POST'])
def generate_report():

    if not check_internal_secret(request):
        return jsonify({'error': 'Unauthorized'}), 401

    bank_statement = request.files.get('bank_statement')
    if not bank_statement:
        return jsonify({'error': 'bank_statement PDF is required'}), 400

    # ─────────────────────────────────────────────────────
    # Demo mode — returns realistic random data
    # Replace this entire block with real ML model later
    # ─────────────────────────────────────────────────────

    ntc_score = random.randint(550, 820)

    if ntc_score >= 750:
        risk_tier = 'low'
    elif ntc_score >= 650:
        risk_tier = 'medium'
    elif ntc_score >= 550:
        risk_tier = 'high'
    else:
        risk_tier = 'very-high'

    response = {
        'ntc_score':    ntc_score,
        'risk_tier':    risk_tier,
        'model_version': 'ntc-v1',
        'feature1':  round(random.uniform(60, 95), 2),
        'feature2':  round(random.uniform(60, 95), 2),
        'feature3':  random.randint(0, 1),
        'feature4':  round(random.uniform(0, 15), 2),
        'feature5':  random.randint(25000, 80000),
        'feature6':  round(random.uniform(10, 45), 2),
        'feature7':  random.randint(50000, 500000),
        'feature8':  random.randint(6, 36),
        'feature9':  round(random.uniform(11, 28), 2),
        'feature10': random.randint(3, 12)
    }

    return jsonify(response), 200