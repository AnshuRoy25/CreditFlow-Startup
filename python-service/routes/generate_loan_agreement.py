from flask import Blueprint, request, jsonify, send_file
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import mm
from datetime import datetime
import os

generate_loan_agreement_bp = Blueprint('generate_loan_agreement', __name__)

INTERNAL_SECRET = os.environ.get('INTERNAL_SECRET', 'dev-secret')
TEMP_DIR = os.path.join(os.path.dirname(__file__), '..', 'temp_agreements')

os.makedirs(TEMP_DIR, exist_ok=True)


def check_internal_secret(req):
    return req.headers.get('X-Internal-Secret') == INTERNAL_SECRET


@generate_loan_agreement_bp.route('/generate-loan-agreement', methods=['POST'])
def generate_loan_agreement():

    if not check_internal_secret(request):
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    if not data:
        return jsonify({'error': 'JSON body required'}), 400

    application_id = data.get('applicationId')
    borrower       = data.get('borrower', {})
    loan           = data.get('loan', {})
    lender         = data.get('lender', {})

    if not application_id:
        return jsonify({'error': 'applicationId is required'}), 400

    file_name = f"loan_agreement_{application_id}.pdf"
    file_path = os.path.join(TEMP_DIR, file_name)

    doc    = SimpleDocTemplate(file_path, pagesize=A4,
                               rightMargin=20*mm, leftMargin=20*mm,
                               topMargin=20*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()
    story  = []

    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=12, spaceBefore=10, spaceAfter=4)
    normal_style  = ParagraphStyle('Normal',  parent=styles['Normal'],   fontSize=10, spaceAfter=4)

    # ── Title ────────────────────────────────────────────────
    story.append(Paragraph('LOAN AGREEMENT', styles['Title']))
    story.append(Paragraph(f'Application ID: {application_id}', normal_style))
    story.append(Paragraph(f'Date: {datetime.now().strftime("%d %B %Y")}', normal_style))
    story.append(Spacer(1, 6*mm))

    # ── Borrower Details ─────────────────────────────────────
    story.append(Paragraph('BORROWER DETAILS', heading_style))
    story.append(Paragraph(f'Name: {borrower.get("name")}', normal_style))
    story.append(Paragraph(f'PAN: {borrower.get("pan")}', normal_style))
    story.append(Paragraph(f'Address: {borrower.get("address")}', normal_style))
    story.append(Paragraph(f'Mobile: {borrower.get("mobile")}', normal_style))
    story.append(Paragraph(f'Email: {borrower.get("email")}', normal_style))
    story.append(Spacer(1, 4*mm))

    # ── Lender Details ───────────────────────────────────────
    story.append(Paragraph('LENDER DETAILS', heading_style))
    story.append(Paragraph(f'Name: {lender.get("name")}', normal_style))
    story.append(Spacer(1, 4*mm))

    # ── Loan Details ─────────────────────────────────────────
    loan_amount     = loan.get('approvedLoanAmount', 0)
    annual_rate     = loan.get('approvedRate', 0)
    tenure_months   = loan.get('approvedTenure', 0)
    emi             = loan.get('approvedEmi', 0)
    total_repayment = round(emi * tenure_months, 2)
    total_interest  = round(total_repayment - loan_amount, 2)

    story.append(Paragraph('LOAN DETAILS', heading_style))
    loan_data = [
        ['Particulars',            'Details'],
        ['Loan Amount',            f'Rs {loan_amount:,}'],
        ['Interest Rate',          f'{annual_rate}% per annum'],
        ['Tenure',                 f'{tenure_months} months'],
        ['Monthly EMI',            f'Rs {emi:,}'],
        ['Total Interest Payable', f'Rs {total_interest:,}'],
        ['Total Repayment',        f'Rs {total_repayment:,}'],
    ]

    loan_table = Table(loan_data, colWidths=[90*mm, 80*mm])
    loan_table.setStyle(TableStyle([
        ('BACKGROUND',     (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR',      (0, 0), (-1, 0), colors.white),
        ('FONTNAME',       (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE',       (0, 0), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('GRID',           (0, 0), (-1, -1), 0.5, colors.grey),
        ('PADDING',        (0, 0), (-1, -1), 6),
    ]))
    story.append(loan_table)

    doc.build(story)

    return jsonify({
        'success':   True,
        'file_path': file_path,
        'file_name': file_name
    }), 200


@generate_loan_agreement_bp.route('/delete-loan-agreement', methods=['POST'])
def delete_loan_agreement():

    if not check_internal_secret(request):
        return jsonify({'error': 'Unauthorized'}), 401

    data           = request.get_json()
    application_id = data.get('applicationId')
    file_name      = f"loan_agreement_{application_id}.pdf"
    file_path      = os.path.join(TEMP_DIR, file_name)

    if os.path.exists(file_path):
        os.remove(file_path)

    return jsonify({'success': True}), 200    


@generate_loan_agreement_bp.route('/get-loan-agreement/<application_id>', methods=['GET'])
def get_loan_agreement(application_id):

    if not check_internal_secret(request):
        return jsonify({'error': 'Unauthorized'}), 401

    file_name = f"loan_agreement_{application_id}.pdf"
    file_path = os.path.join(TEMP_DIR, file_name)

    if not os.path.exists(file_path):
        return jsonify({'error': 'File not found'}), 404

    return send_file(file_path, mimetype='application/pdf')