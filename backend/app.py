from flask import Flask, send_from_directory
from flask_cors import CORS
import os
from backend.config import Config
from backend.routes import api_bp

app = Flask(__name__, 
            static_folder="../frontend/static",
            template_folder="../frontend/templates")
app.config.from_object(Config)
CORS(app)

# Registrar blueprint da API
app.register_blueprint(api_bp, url_prefix='/api')

# Inicializar o banco de dados
from backend.routes import init_app
init_app(app)

# Rota para arquivos estáticos
@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('../frontend/static', path)

# Rota para service worker (precisa estar na raiz)
@app.route('/sw.js')
def service_worker():
    return send_from_directory('../frontend', 'sw.js')

# Rota para manifest.json
@app.route('/manifest.json')
def manifest():
    return send_from_directory('../frontend/static', 'manifest.json')

# Rota principal - serve a aplicação
@app.route('/', defaults={'path': ''})
def serve_index(path):
    from flask import render_template
    return render_template('index.html')

# Rota para a página de sincronização
@app.route('/sync')
def serve_sync():
    from flask import render_template
    return render_template('sync.html')

# Rota para a página de configuração
@app.route('/config')
def serve_config():
    from flask import render_template
    return render_template('config.html')

# Rota para outras páginas
@app.route('/<path:path>')
def serve(path):
    from flask import render_template, abort
    try:
        return render_template(f'{path}.html')
    except:
        abort(404)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
