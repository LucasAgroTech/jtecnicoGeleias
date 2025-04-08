from flask import Blueprint, jsonify, request
from backend.models import db, Rating
from datetime import datetime
import traceback

api_bp = Blueprint('api', __name__)

@api_bp.route('/ratings', methods=['POST'])
def create_rating():
    try:
        data = request.json
        
        # Validação básica
        if not data or 'identifier' not in data or 'rating' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: identifier, rating'
            }), 400
        
        # Validação de rating
        rating_value = int(data['rating'])
        if rating_value < 1 or rating_value > 9:
            return jsonify({
                'success': False,
                'error': 'Rating must be between 1 and 9'
            }), 400
        
        # Processar timestamp
        created_at = None
        if 'timestamp' in data and data['timestamp']:
            try:
                created_at = datetime.fromisoformat(data['timestamp'].replace('Z', '+00:00'))
            except ValueError:
                created_at = datetime.utcnow()
        
        # Obter device_id
        device_id = request.headers.get('X-Device-Id', 'unknown')
        
        # Criar registro
        new_rating = Rating(
            identifier=data['identifier'],
            rating=rating_value,
            comments=data.get('comments'),
            device_id=device_id,
            created_at=created_at
        )
        
        db.session.add(new_rating)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'id': new_rating.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/ratings', methods=['GET'])
def get_ratings():
    try:
        ratings = Rating.query.order_by(Rating.created_at.desc()).all()
        return jsonify({
            'success': True,
            'data': [rating.to_dict() for rating in ratings]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Inicializar banco de dados
def init_app(app):
    db.init_app(app)
    with app.app_context():
        db.create_all()
