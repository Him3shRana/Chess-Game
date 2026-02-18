from flask import Flask,render_template,url_for,jsonify,request
from chess_engine import *
import chess
import chess.engine

app=Flask(__name__)

# Material-based piece values
piece_value = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 0  # King is not used in score calculation
}

def evaluate_position(board):
    score = 0
    for piece in board.piece_map().values():
        score += piece_value[piece.piece_type] * (1 if piece.color == chess.WHITE else -1)
    return score


@app.route("/")


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

@app.route("/evaluate_move", methods=["POST"])
def evaluate_move():
    data = request.get_json()
    move_uci = data.get("move")
    fen = data.get("fen")
    if not move_uci:
        return jsonify({"error": "No move provided"}), 400

    try:
        board = chess.Board(fen) 
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
    except Exception as e:
        return jsonify({"error": str(e)}), 500




if __name__=="__name__":
    app.run(debug=True)
#code edited
chess_game = ChessEngine()

@app.route('/game_state', methods=['GET'])
def get_game_state():
    return jsonify({
        "board": chess_game.board.fen(), 
        # "captured": chess_game.get_captured_pieces()
    })

def get_game_state():
    return jsonify({
        "board": chess_game.board.fen(),
    })
# def evaluate_position(board):
#     """Evaluates the current board position using Stockfish."""
#     try:
#         stock_fish = "C:\\Users\\ASUS\\Downloads\\stockfish-windows-x86-64-avx2"
#         with chess.engine.SimpleEngine.popen_uci(stock_fish) as engine:
#             info = engine.analyse(board, chess.engine.Limit(time=0.1))
#             score = info["score"].relative.score(mate_score=10000)  # Converts mate to numerical score
#             print(f"Stockfish Score: {score}")  # ✅ Debugging log
#             return score if score is not None else 0  # ✅ Prevent NoneType error
#     except Exception as e:
#         print(f"Stockfish evaluation error: {e}")
#         return 0  # ✅ Return 0 instead of crashing





