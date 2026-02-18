from flask import Flask, render_template,jsonify,request
from chess_engine import *

app = Flask(__name__)

@app.route('/')
def index():
    return render_template("index.html")


@app.route('/move/<int:depth>/<path:fen>/')
def get_move(depth, fen):
    print(depth)
    print("Calculating...")
    engine = Engine(fen)
    move = engine.iterative_deepening(depth - 1)
    print("Move found!", move)
    print()
    return move


@app.route('/test/<string:tester>')
def test_get(tester):
    return tester


# Piece value mapping (material-based, no Stockfish)
piece_value = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 0
}

def evaluate_position(board):
    score = 0
    for piece in board.piece_map().values():
        score += piece_value[piece.piece_type] * (1 if piece.color == chess.WHITE else -1)
    return score


if __name__ == '__main__':
    app.run(debug=True)
#code edited
chess_game = ChessEngine()

@app.route('/game_state', methods=['GET'])
def get_game_state():
    return jsonify({
        "board": chess_game.board.fen(), 
        "captured": chess_game.get_captured_pieces()
    })
chess_game = Engine("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")

@app.route("/evaluate_move", methods=["POST"])
def evaluate_move():
    data = request.get_json()
    move_uci = data.get("move")

    if not move_uci:
        return jsonify({"error": "No move provided"}), 400

    board = chess_game.copy()
    move = chess.Move.from_uci(move_uci)

    if move not in board.legal_moves:
        return jsonify({"error": "Invalid move"}), 400

    before_score = evaluate_position(board)
    board.push(move)
    after_score = evaluate_position(board)
    delta = after_score - before_score

    # Score interpretation
    if delta > 1:
        quality = "Excellent"
    elif delta > 0:
        quality = "Good"
    elif delta == 0:
        quality = "Moderate"
    else:
        quality = "Bad"

    return jsonify({"quality": quality})
    

@app.route('/test_captured')
def test_captured():
    return jsonify(chess_game.get_captured_pieces())

if __name__ == '__main__':
    app.run(debug=True)
print(app.url_map)



