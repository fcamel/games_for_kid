class CrazyhouseChess {
    constructor() {
        this.board = this.initializeBoard();
        this.currentPlayer = 'white';
        this.selectedSquare = null;
        this.selectedPiece = null;
        this.gameHistory = [];
        this.capturedPieces = {
            white: [],
            black: []
        };
        this.gameStatus = 'playing';
        
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
        
        this.updateCapturedPieces();
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
        
        if (this.selectedPiece) {
            // Try to drop the selected piece
            if (this.canDropPiece(row, col)) {
                this.dropPiece(row, col);
                this.clearSelection();
            } else {
                this.clearSelection();
            }
            return;
        }
        
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
        this.selectedPiece = null;
        document.querySelectorAll('.chess-square').forEach(square => {
            square.classList.remove('selected', 'possible-move');
        });
        document.querySelectorAll('.droppable-piece').forEach(piece => {
            piece.classList.remove('selected');
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
            isDrop: false
        });
        
        // Handle captured piece
        if (capturedPiece) {
            // When you capture a piece, it becomes your color in your piece bank
            const capturedPieceForBank = { ...capturedPiece, color: this.currentPlayer };
            this.capturedPieces[this.currentPlayer].push(capturedPieceForBank);
        }
        
        // Make the move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;
        
        // Switch players
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        this.updateUI();
        this.checkGameStatus();
    }
    
    canDropPiece(row, col) {
        if (!this.selectedPiece) return false;
        
        // Can't drop on occupied square
        if (this.board[row][col] !== null) return false;
        
        // Pawns can't be dropped on first or last rank
        if (this.selectedPiece.type === 'p' && (row === 0 || row === 7)) return false;
        
        return true;
    }
    
    dropPiece(row, col) {
        if (!this.selectedPiece || !this.canDropPiece(row, col)) {
            console.log('Cannot drop piece:', { selectedPiece: this.selectedPiece, canDrop: this.canDropPiece(row, col) });
            return;
        }
        
        console.log('Dropping piece:', this.selectedPiece, 'at', row, col);
        
        // Save drop to history
        this.gameHistory.push({
            from: null,
            to: { row: row, col: col },
            piece: this.selectedPiece,
            capturedPiece: null,
            isDrop: true
        });
        
        // Place the piece
        this.board[row][col] = this.selectedPiece;
        
        // Remove from captured pieces
        const pieceIndex = this.capturedPieces[this.currentPlayer].findIndex(p => 
            p.type === this.selectedPiece.type && p.color === this.selectedPiece.color
        );
        if (pieceIndex > -1) {
            this.capturedPieces[this.currentPlayer].splice(pieceIndex, 1);
        }
        
        // Switch players
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
        
        this.updateUI();
        this.checkGameStatus();
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
        
        this.updateCapturedPieces();
        this.updateGameInfo();
    }
    
    updateCapturedPieces() {
        const whiteBank = document.getElementById('white-piece-bank');
        const blackBank = document.getElementById('black-piece-bank');
        
        whiteBank.innerHTML = '';
        blackBank.innerHTML = '';
        
        this.capturedPieces.white.forEach((piece, index) => {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'droppable-piece';
            pieceElement.textContent = this.getPieceSymbol(piece);
            pieceElement.dataset.pieceIndex = index;
            pieceElement.dataset.pieceType = piece.type;
            pieceElement.dataset.pieceColor = piece.color;
            pieceElement.addEventListener('click', (e) => this.selectPieceForDrop(piece, e.target));
            whiteBank.appendChild(pieceElement);
        });
        
        this.capturedPieces.black.forEach((piece, index) => {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'droppable-piece';
            pieceElement.textContent = this.getPieceSymbol(piece);
            pieceElement.dataset.pieceIndex = index;
            pieceElement.dataset.pieceType = piece.type;
            pieceElement.dataset.pieceColor = piece.color;
            pieceElement.addEventListener('click', (e) => this.selectPieceForDrop(piece, e.target));
            blackBank.appendChild(pieceElement);
        });
    }
    
    selectPieceForDrop(piece, element) {
        // Only allow dropping pieces for the current player
        // In Crazyhouse, you drop pieces as your own color (the captured piece becomes yours)
        if (piece.color !== this.currentPlayer) {
            console.log('Cannot drop piece - you can only drop pieces from your own piece bank');
            return;
        }
        
        console.log('Selecting piece for drop:', piece);
        this.clearSelection();
        this.selectedPiece = piece;
        
        // Highlight the clicked piece element
        if (element) {
            element.classList.add('selected');
        }
        
        // Show possible drop squares
        this.showPossibleDrops();
    }
    
    showPossibleDrops() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.canDropPiece(row, col)) {
                    const squareElement = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                    squareElement.classList.add('possible-move');
                }
            }
        }
    }
    
    updateGameInfo() {
        document.getElementById('current-player').textContent = 
            this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1);
        
        document.getElementById('game-status').textContent = 
            this.gameStatus === 'playing' ? 'Game in progress' : this.gameStatus;
    }
    
    checkGameStatus() {
        // Check for checkmate or stalemate
        const whiteKing = this.findKing('white');
        const blackKing = this.findKing('black');
        
        if (!whiteKing) {
            this.gameStatus = 'black_wins';
            document.getElementById('game-status').textContent = 'Black wins!';
        } else if (!blackKing) {
            this.gameStatus = 'white_wins';
            document.getElementById('game-status').textContent = 'White wins!';
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
        this.selectedPiece = null;
        this.gameHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.gameStatus = 'playing';
        
        this.initializeUI();
        document.getElementById('game-status').textContent = 'Game in progress';
    }
    
    undoMove() {
        if (this.gameHistory.length === 0) return;
        
        const lastMove = this.gameHistory.pop();
        
        if (lastMove.isDrop) {
            // Undo a piece drop
            this.board[lastMove.to.row][lastMove.to.col] = null;
            this.capturedPieces[this.currentPlayer].push(lastMove.piece);
        } else {
            // Undo a regular move
            this.board[lastMove.from.row][lastMove.from.col] = lastMove.piece;
            this.board[lastMove.to.row][lastMove.to.col] = lastMove.capturedPiece;
            
            // Restore captured piece if it was captured
            if (lastMove.capturedPiece) {
                const pieceIndex = this.capturedPieces[this.currentPlayer].findIndex(p => 
                    p.type === lastMove.capturedPiece.type && p.color === lastMove.capturedPiece.color
                );
                if (pieceIndex > -1) {
                    this.capturedPieces[this.currentPlayer].splice(pieceIndex, 1);
                }
            }
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
    new CrazyhouseChess();
});