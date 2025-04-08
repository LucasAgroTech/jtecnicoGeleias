from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Rating(db.Model):
    __tablename__ = 'ratings'
    
    id = db.Column(db.Integer, primary_key=True)
    identifier = db.Column(db.String(255), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comments = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    device_id = db.Column(db.String(255), nullable=True)
    
    def __init__(self, identifier, rating, comments=None, device_id=None, created_at=None):
        self.identifier = identifier
        self.rating = rating
        self.comments = comments
        self.device_id = device_id
        if created_at:
            self.created_at = created_at
    
    def to_dict(self):
        return {
            'id': self.id,
            'identifier': self.identifier,
            'rating': self.rating,
            'comments': self.comments,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'device_id': self.device_id
        }