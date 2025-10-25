class AtomicChess {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.gameHistory = [];
        this.gameStatus = 'playing';
        this.explosionOverlay = document.getElementById('explosion-overlay');
        
        this.initializeUI();
        this.setupEventListeners();
    }
    
    initializeBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        
        // Place black pieces
        board[0] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'].map(piece => ({ type: piece, color: 'black' }));
        board[1] = Array(8).fill({ type: 'p', color: 'black' });
        
        // Place white pieces
        board[6] = Array(8).fill({ type: 'p', color: 'white' });
        board[7] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'].map(piece => ({ type: piece, color: 'white' }));
        
        return board;
    }
    
    initializeUI() {
        const boardElement = document.getElementById('chess-board');
        boardElement.innerHTML = '';
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                square.className = `chess-square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;
                square.addEventListener('click', () => this.handleSquareClick(row, col));
                
                if (this.board[row][col]) {
                    const piece = document.createElement('div');
                    piece.className = `chess-piece ${this.board[row][col].color}`;
                    piece.textContent = this.getPieceSymbol(this.board[row][col]);
                    square.appendChild(piece);
                }
                
                boardElement.appendChild(square);
            }
        }
        
        this.updateGameInfo();
    }
    
    getPieceSymbol(piece) {
        const symbols = {
            'white': { 'k': '♔', 'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘', 'p': '♙' },
            'black': { 'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟' }
        };
        return symbols[piece.color][piece.type];
    }
    
    handleSquareClick(row, col) {
        const square = this.board[row][col];
        
        if (this.selectedSquare) {
            if (this.selectedSquare.row === row && this.selectedSquare.col === col) {
                // Deselect
                this.clearSelection();
                return;
            }
            
            if (this.isValidMove(this.selectedSquare.row, this.selectedSquare.col, row, col)) {
                this.makeMove(this.selectedSquare.row, this.selectedSquare.col, row, col);
                this.clearSelection();
            } else {
                // Select new piece if it belongs to current player
                if (square && square.color === this.currentPlayer) {
                    this.selectSquare(row, col);
                } else {
                    this.clearSelection();
                }
            }
        } else {
            // Select piece if it belongs to current player
            if (square && square.color === this.currentPlayer) {
                this.selectSquare(row, col);
            }
        }
    }
    
    selectSquare(row, col) {
        this.clearSelection();
        this.selectedSquare = { row, col };
        
        const squareElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        squareElement.classList.add('selected');
        
        // Show possible moves
        this.showPossibleMoves(row, col);
    }
    
    clearSelection() {
        this.selectedSquare = null;
        document.querySelectorAll('.chess-square').forEach(square => {
            square.classList.remove('selected', 'possible-move');
        });
    }
    
    showPossibleMoves(row, col) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.isValidMove(row, col, r, c)) {
                    const squareElement = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                    squareElement.classList.add('possible-move');
                }
            }
        }
    }
    
    isValidMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const targetPiece = this.board[toRow][toCol];
        
        // Can't move to same square
        if (fromRow === toRow && fromCol === toCol) return false;
        
        // Can't capture own piece
        if (targetPiece && targetPiece.color === piece.color) return false;
        
        // Check piece-specific movement rules
        return this.isValidPieceMove(piece, fromRow, fromCol, toRow, toCol);
    }
    
    isValidPieceMove(piece, fromRow, fromCol, toRow, toCol) {
        const rowDiff = toRow - fromRow;
        const colDiff = toCol - fromCol;
        
        switch (piece.type) {
            case 'p':
                return this.isValidPawnMove(piece, fromRow, fromCol, toRow, toCol, rowDiff, colDiff);
            case 'r':
                return this.isValidRookMove(fromRow, fromCol, toRow, toCol, rowDiff, colDiff);
            case 'n':
                return this.isValidKnightMove(rowDiff, colDiff);
            case 'b':
                return this.isValidBishopMove(fromRow, fromCol, toRow, toCol, rowDiff, colDiff);
            case 'q':
                return this.isValidQueenMove(fromRow, fromCol, toRow, toCol, rowDiff, colDiff);
            case 'k':
                return this.isValidKingMove(rowDiff, colDiff);
            default:
                return false;
        }
    }
    
    isValidPawnMove(piece, fromRow, fromCol, toRow, toCol, rowDiff, colDiff) {
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        
        // Forward move
        if (colDiff === 0 && this.board[toRow][toCol] === null) {
            if (rowDiff === direction) return true;
            if (fromRow === startRow && rowDiff === 2 * direction) return true;
        }
        
        // Diagonal capture
        if (Math.abs(colDiff) === 1 && rowDiff === direction) {
            return this.board[toRow][toCol] !== null;
        }
        
        return false;
    }
    
    isValidRookMove(fromRow, fromCol, toRow, toCol, rowDiff, colDiff) {
        if (rowDiff !== 0 && colDiff !== 0) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }
    
    isValidKnightMove(rowDiff, colDiff) {
        return (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) ||
               (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2);
    }
    
    isValidBishopMove(fromRow, fromCol, toRow, toCol, rowDiff, colDiff) {
        if (Math.abs(rowDiff) !== Math.abs(colDiff)) return false;
        return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }
    
    isValidQueenMove(fromRow, fromCol, toRow, toCol, rowDiff, colDiff) {
        return this.isValidRookMove(fromRow, fromCol, toRow, toCol, rowDiff, colDiff) ||
               this.isValidBishopMove(fromRow, fromCol, toRow, toCol, rowDiff, colDiff);
    }
    
    isValidKingMove(rowDiff, colDiff) {
        return Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1;
    }
    
    isPathClear(fromRow, fromCol, toRow, toCol) {
        const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
        const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
        
        let currentRow = fromRow + rowStep;
        let currentCol = fromCol + colStep;
        
        while (currentRow !== toRow || currentCol !== toCol) {
            if (this.board[currentRow][currentCol] !== null) return false;
            currentRow += rowStep;
            currentCol += colStep;
        }
        
        return true;
    }
    
    makeMove(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const capturedPiece = this.board[toRow][toCol];
        
        // Save move to history
        this.gameHistory.push({
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            piece: piece,
            capturedPiece: capturedPiece,
            explosions: []
        });
        
        // Make the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Handle explosion if a piece was captured
        if (capturedPiece) {
            this.handleExplosion(toRow, toCol);
        }
        
        // Update UI immediately after move
        this.updateUI();
        
        // Switch players
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        // Small delay to ensure UI is updated
        setTimeout(() => {
            this.updateGameInfo();
            this.checkGameStatus();
        }, 50);
    }
    
    handleExplosion(explosionRow, explosionCol) {
        const destroyedPieces = [];
        
        // Check all 8 surrounding squares
        for (let row = explosionRow - 1; row <= explosionRow + 1; row++) {
            for (let col = explosionCol - 1; col <= explosionCol + 1; col++) {
                if (row >= 0 && row < 8 && col >= 0 && col < 8) {
                    if (this.board[row][col] !== null) {
                        destroyedPieces.push({
                            row: row,
                            col: col,
                            piece: this.board[row][col]
                        });
                        this.board[row][col] = null;
                    }
                }
            }
        }
        
        // Update the last move's explosion data
        if (this.gameHistory.length > 0) {
            this.gameHistory[this.gameHistory.length - 1].explosions = destroyedPieces;
        }
        
        // Create explosion effects (non-blocking)
        this.createExplosionEffect(explosionRow, explosionCol);
        
        // Check for chain reactions
        this.checkChainReactions(destroyedPieces);
    }
    
    createExplosionEffect(row, col) {
        const explosion = document.createElement('div');
        explosion.className = 'explosion explosion-effect';
        explosion.style.left = `${col * 60}px`;
        explosion.style.top = `${row * 60}px`;
        
        this.explosionOverlay.appendChild(explosion);
        
        // Remove explosion element after animation
        setTimeout(() => {
            if (explosion.parentNode) {
                explosion.parentNode.removeChild(explosion);
            }
        }, 800);
    }
    
    checkChainReactions(destroyedPieces) {
        // Check if any of the destroyed pieces can cause chain reactions
        for (const destroyed of destroyedPieces) {
            if (destroyed.piece.type !== 'k') { // Kings don't cause chain reactions
                // Check if this piece was adjacent to other pieces that might explode
                for (let row = destroyed.row - 1; row <= destroyed.row + 1; row++) {
                    for (let col = destroyed.col - 1; col <= destroyed.col + 1; col++) {
                        if (row >= 0 && row < 8 && col >= 0 && col < 8) {
                            if (this.board[row][col] !== null && this.board[row][col].type !== 'k') {
                                // Create chain explosion effect
                                setTimeout(() => {
                                    this.createChainExplosionEffect(row, col);
                                    this.board[row][col] = null;
                                }, 200);
                            }
                        }
                    }
                }
            }
        }
    }
    
    createChainExplosionEffect(row, col) {
        const explosion = document.createElement('div');
        explosion.className = 'explosion chain-explosion';
        explosion.style.left = `${col * 60}px`;
        explosion.style.top = `${row * 60}px`;
        
        this.explosionOverlay.appendChild(explosion);
        
        // Remove explosion element after animation
        setTimeout(() => {
            if (explosion.parentNode) {
                explosion.parentNode.removeChild(explosion);
            }
        }, 600);
    }
    
    updateUI() {
        // Update board display
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const squareElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                squareElement.innerHTML = '';
                
                if (this.board[row][col]) {
                    const piece = document.createElement('div');
                    piece.className = `chess-piece ${this.board[row][col].color}`;
                    piece.textContent = this.getPieceSymbol(this.board[row][col]);
                    squareElement.appendChild(piece);
                }
            }
        }
        
        this.updateGameInfo();
    }
    
    updateGameInfo() {
        document.getElementById('current-player').textContent = 
            this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1);
        
        document.getElementById('game-status').textContent = 
            this.gameStatus === 'playing' ? 'Game in progress' : this.gameStatus;
    }
    
    checkGameStatus() {
        // Check for king destruction
        const whiteKing = this.findKing('white');
        const blackKing = this.findKing('black');
        
        if (!whiteKing) {
            this.gameStatus = 'black_wins';
            document.getElementById('game-status').textContent = 'Black wins! (White king destroyed)';
        } else if (!blackKing) {
            this.gameStatus = 'white_wins';
            document.getElementById('game-status').textContent = 'White wins! (Black king destroyed)';
        } else {
            this.gameStatus = 'playing';
            document.getElementById('game-status').textContent = 'Game in progress';
        }
    }
    
    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === 'k' && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }
    
    newGame() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.gameHistory = [];
        this.gameStatus = 'playing';
        
        // Clear explosion overlay
        this.explosionOverlay.innerHTML = '';
        
        this.initializeUI();
        document.getElementById('game-status').textContent = 'Game in progress';
    }
    
    undoMove() {
        if (this.gameHistory.length === 0) return;
        
        const lastMove = this.gameHistory.pop();
        
        // Restore the piece to original position
        this.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
        this.board[lastMove.to.row][lastMove.to.col] = lastMove.capturedPiece;
        
        // Restore exploded pieces
        for (const explosion of lastMove.explosions) {
            this.board[explosion.row][explosion.col] = explosion.piece;
        }
        
        // Switch back to previous player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        this.clearSelection();
        this.updateUI();
        this.checkGameStatus();
    }
    
    setupEventListeners() {
        document.getElementById('new-game-btn').addEventListener('click', () => this.newGame());
        document.getElementById('undo-move-btn').addEventListener('click', () => this.undoMove());
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AtomicChess();
});