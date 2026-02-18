var board,
  game = new Chess(),
  statusEl = $('#status'),
  fenEl = $('#fen'),
  pgnEl = $('#pgn');


// do not pick up pieces if the game is over
// only pick up pieces for the side to move
var onDragStart = function(source, piece, position, orientation) {
  if (game.game_over() === true ||
      (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
};

function evaluateMove(move, fen) {
    console.log("Sending move to Flask:", move, "FEN:", fen);

    $.ajax({
        url: "/evaluate_move",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ move: move, fen: fen }),
        success: function(response) {
            console.log("Move Quality Response:", response);

            if (!response.quality) {
                console.error("Move quality is missing in the response!");
                return;
            }

            $("#move-quality").text("Move Quality: " + response.quality)
                .css("color", response.quality === "Excellent" ? "green" :
                                 response.quality === "Good" ? "blue" :
                                 response.quality === "Moderate" ? "orange" : "red");
        },
        error: function(xhr) {
            console.error("Move evaluation failed:", xhr.responseText);
        }
    });
}


var onDrop = function(source, target) {
    // Save the FEN before making the move (used for evaluation)
    var fenBeforeMove = game.fen();

    // Try to make the move
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q'  // always promote to queen
    });

    // If move is illegal, cancel it
    if (move === null) return 'snapback';

    // Update game status, move history, captured pieces
    updateStatus();
    getResponseMove();
    evaluateMove(source + target, fenBeforeMove);

    // Start the timer for the next player (after the move is made)
    if (game.turn() === 'w') {
        startTimer('w');
    } else {
        startTimer('b');
    }
};

  

// update the board position after the piece snap
// for castling, en passant, pawn promotion
var onSnapEnd = function() {
    board.position(game.fen());
};



var capturedWhite = [];
var capturedBlack = [];


var updateStatus = function() {
  var status = '';

  var moveColor = game.turn() === 'b' ? 'Black' : 'White';
  status = moveColor + ' to move';

  if (game.in_checkmate()) {
      status = 'Game over, ' + moveColor + ' is in checkmate.';
      clearInterval(activeTimer);
  } else if (game.in_draw()) {
      status = 'Game over, drawn position';
      clearInterval(activeTimer);
  } else if (game.in_check()) {
      status += ', ' + moveColor + ' is in check';
  }

  setStatus(status);

  // Update move history (PGN)
  let pgn = game.pgn(); 
  $("#move-history").html(pgn.replace(/\n/g, "<br>")); 

  // Capture tracking logic (same as before)
  const pieceSymbols = {
      'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
      'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
  };

  var history = game.history({ verbose: true });

  capturedWhite = [];
  capturedBlack = [];

  for (var i = 0; i < history.length; i++) {
      if ("captured" in history[i]) {
          if (history[i].color === "b") {
              capturedBlack.push(pieceSymbols[history[i]["captured"]] || history[i]["captured"]);
          } else {
              capturedWhite.push(pieceSymbols[history[i]["captured"]] || history[i]["captured"]);
          }
      }
  }

  $("#captured-white").html("White Captured: " + capturedWhite.join(" "));
  $("#captured-black").html("Black Captured: " + capturedBlack.join(" "));
  
  setStatus(status);
  getLastCapture();
  createTable();
  

  statusEl.html(status);
  fenEl.html(game.fen());
  pgnEl.html(game.pgn());
};



var cfg = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd
};

var randomResponse = function() {
    fen = game.fen()
    $.get($SCRIPT_ROOT + "/move/" + fen, function(data) {
        game.move(data, {sloppy: true});
        // board.position(game.fen());
        updateStatus();
    })
}

var getResponseMove = function() {
    var e = document.getElementById("sel1");
    var depth = e.options[e.selectedIndex].value;
    fen = game.fen();

    $.get($SCRIPT_ROOT + "/move/" + depth + "/" + fen, function(data) {
        game.move(data, {sloppy: true});
        updateStatus();

        // ✅ Restart timer for the player who now has to move
        if (game.turn() === 'w') {
            startTimer('w');
        } else {
            startTimer('b');
        }

        // Delay animation to prevent stutter
        setTimeout(function(){ board.position(game.fen()); }, 100);
    });
};

// did this based on a stackoverflow answer
// http://stackoverflow.com/questions/29493624/cant-display-board-whereas-the-id-is-same-when-i-use-chessboard-js
setTimeout(function() {
    board = ChessBoard('board', cfg);
    // updateStatus();
}, 0);

    // Start white's timer on page load



var setPGN = function() {
  var table = document.getElementById("pgn");
  var pgn = game.pgn().split(" ");
  var move = pgn[pgn.length - 1];
}

var createTable = function() {

    var pgn = game.pgn().split(" ");
    var data = [];

    for (i = 0; i < pgn.length; i += 3) {
        var index = i / 3;
        data[index] = {};
        for (j = 0; j < 3; j++) {
            var label = "";
            if (j === 0) {
                label = "moveNumber";
            } else if (j === 1) {
                label = "whiteMove";
            } else if (j === 2) {
                label = "blackMove";
            }
            if (pgn.length > i + j) {
                data[index][label] = pgn[i + j];
            } else {
                data[index][label] = "";
            }
        }
    }

    $('#pgn tr').not(':first').remove();
    var html = '';
    for (var i = 0; i < data.length; i++) {
        html += '<tr><td>' + data[i].moveNumber + '</td><td>'
        + data[i].whiteMove + '</td><td>'
        + data[i].blackMove + '</td></tr>';
    }

    $('#pgn tr').first().after(html);
}

var updateScroll = function() {
    $('#moveTable').scrollTop($('#moveTable')[0].scrollHeight);
}

var setStatus = function(status) {
  document.getElementById("status").innerHTML = status;
}

var takeBack = function() {
    game.undo();
    if (game.turn() != "w") {
        game.undo();
    }
    board.position(game.fen());
    updateStatus();
}

var newGame = function() {
    game.reset();
    board.start();
    updateStatus();
    resetTimers();

    console.log("Turn after reset:", game.turn());
    startTimer(game.turn());
}

var getCapturedPieces = function() {
    var history = game.history({ verbose: true });
    for (var i = 0; i < history.length; i++) {
        if ("captured" in history[i]) {
            console.log(history[i]["captured"]);
        }
    }
}

var getLastCapture = function() {
    var history = game.history({ verbose: true });
    var index = history.length - 1;

    if (history[index] != undefined && "captured" in history[index]) {
        console.log(history[index]["captured"]);
    }
}
function updateCapturedPieces() {
  $.getJSON("/game_state", function(data) {
      console.log("Captured pieces data:", data);  // Debugging log

      let whiteCaptured = data.captured.white.join(' ');  // Convert array to string
      let blackCaptured = data.captured.black.join(' ');

      $("#captured-white").html(whiteCaptured);  // Update div with captured pieces
      $("#captured-black").html(blackCaptured);
  }).fail(function(jqXHR, textStatus, errorThrown) {
      console.error("Error fetching game state:", textStatus, errorThrown);  // Log errors
  });
}

let whiteTime = 300; // seconds
let blackTime = 300;
let activeTimer = null;

function updateTimerDisplay() {
    $("#white-timer").text(formatTime(whiteTime));
    $("#black-timer").text(formatTime(blackTime));
}

function formatTime(seconds) {
    let min = Math.floor(seconds / 60);
    let sec = seconds % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function startTimer(color) {
    clearInterval(activeTimer);

    activeTimer = setInterval(() => {
        if (color === 'w') {
            whiteTime--;
            if (whiteTime <= 0) {
                clearInterval(activeTimer);
                setStatus("Game over — White ran out of time!");
                return;
            }
        } else {
            blackTime--;
            if (blackTime <= 0) {
                clearInterval(activeTimer);
                setStatus("Game over — Black ran out of time!");
                return;
            }
        }

        updateTimerDisplay();
    }, 1000);
}


function resetTimers() {
    whiteTime = 300;
    blackTime = 300;
    updateTimerDisplay();
}


