from fastapi import FastAPI, WebSocket
from fastapi.staticfiles import StaticFiles
import uvicorn
import json
from typing import Dict, Set
import random

app = FastAPI()
app.mount("/static", StaticFiles(directory="."), name="static")

# Store connected clients
clients: Dict[str, WebSocket] = {}
waiting_players: Set[str] = set()
game_pairs: Dict[str, str] = {}  # player1_id -> player2_id

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    clients[client_id] = websocket
    
    if len(waiting_players) > 0:
        # Match with a waiting player
        opponent_id = waiting_players.pop()
        game_pairs[client_id] = opponent_id
        game_pairs[opponent_id] = client_id
        
        # Notify both players about the match
        await clients[client_id].send_json({
            "type": "game_start",
            "player_number": 2
        })
        await clients[opponent_id].send_json({
            "type": "game_start",
            "player_number": 1
        })
    else:
        # Wait for another player
        waiting_players.add(client_id)
        await websocket.send_json({
            "type": "waiting",
            "message": "Waiting for another player..."
        })
    
    try:
        while True:
            data = await websocket.receive_json()
            if data["type"] == "rectangle_cleared":
                opponent_id = game_pairs.get(client_id)
                if opponent_id and opponent_id in clients:
                    # Send new rectangles to opponent
                    await clients[opponent_id].send_json({
                        "type": "add_rectangles",
                        "count": data["combo_count"]  # Number of rectangles to add
                    })
            elif data["type"] == "game_over":
                opponent_id = game_pairs.get(client_id)
                if opponent_id and opponent_id in clients:
                    await clients[opponent_id].send_json({
                        "type": "opponent_game_over"
                    })
    except:
        # Clean up when a client disconnects
        if client_id in clients:
            del clients[client_id]
        if client_id in waiting_players:
            waiting_players.remove(client_id)
        opponent_id = game_pairs.get(client_id)
        if opponent_id:
            if opponent_id in game_pairs:
                del game_pairs[opponent_id]
            if opponent_id in clients:
                await clients[opponent_id].send_json({
                    "type": "opponent_disconnected"
                })
            if client_id in game_pairs:
                del game_pairs[client_id]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
