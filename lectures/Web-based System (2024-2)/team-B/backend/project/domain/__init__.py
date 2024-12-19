from flask import Flask, jsonify
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    CORS(app)

    # api들 등록 예시
    # from .users import user_controller
    # app.register_blueprint(user_controller.bp)

    from .gangnam import gagnam_controller

    app.register_blueprint(gagnam_controller.bp)

    return app
