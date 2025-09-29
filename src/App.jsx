import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'

function App() {
  const [showCursor, setShowCursor] = useState(true)
  const [displayText, setDisplayText] = useState('')
  const [showGameModal, setShowGameModal] = useState(false)
  const welcomeText = 'WELCOME TO THE 8-BIT ZONE'
  
  // Game arena reference
  const gameArenaRef = useRef(null)
  const [arenaDimensions, setArenaDimensions] = useState({ width: 600, height: 400 })

  // Game state
  const [gameState, setGameState] = useState({
    ball: { x: 300, y: 200, dx: 3, dy: 2 },
    leftPaddle: { y: 150 },
    rightPaddle: { y: 150 },
    score: { left: 0, right: 0 },
    gameActive: false
  })

  const [keys, setKeys] = useState({})

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && !showGameModal) {
      setShowGameModal(true)
      setGameState(prev => ({ ...prev, gameActive: true }))
    }
    if (event.key === 'Escape' && showGameModal) {
      setShowGameModal(false)
      setGameState(prev => ({ ...prev, gameActive: false }))
    }
    setKeys(prev => ({ ...prev, [event.key]: true }))
  }, [showGameModal])

  const startGame = useCallback(() => {
    setShowGameModal(true)
    setGameState(prev => ({ ...prev, gameActive: true }))
  }, [])

  // Update arena dimensions when modal opens
  useEffect(() => {
    if (showGameModal && gameArenaRef.current) {
      const updateDimensions = () => {
        const rect = gameArenaRef.current.getBoundingClientRect()
        const newDimensions = { 
          width: rect.width - 4, // subtract border
          height: rect.height - 4 
        }
        setArenaDimensions(newDimensions)
        
        // Reset game state with new dimensions
        setGameState(prev => ({
          ...prev,
          ball: { 
            x: newDimensions.width / 2, 
            y: newDimensions.height / 2, 
            dx: 3, 
            dy: 2 
          },
          leftPaddle: { y: newDimensions.height / 2 - 40 },
          rightPaddle: { y: newDimensions.height / 2 - 40 }
        }))
      }
      
      // Small delay to ensure DOM is rendered
      setTimeout(updateDimensions, 100)
      
      // Update on resize
      window.addEventListener('resize', updateDimensions)
      return () => window.removeEventListener('resize', updateDimensions)
    }
  }, [showGameModal])

  const handleKeyUp = useCallback((event) => {
    setKeys(prev => ({ ...prev, [event.key]: false }))
  }, [])

  useEffect(() => {
    // Typing effect
    let index = 0
    const typeInterval = setInterval(() => {
      if (index < welcomeText.length) {
        setDisplayText(welcomeText.slice(0, index + 1))
        index++
      } else {
        clearInterval(typeInterval)
      }
    }, 100)

    // Blinking cursor effect
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 500)

    // Keyboard event listeners
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      clearInterval(typeInterval)
      clearInterval(cursorInterval)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  // Game loop
  useEffect(() => {
    if (!showGameModal || !gameState.gameActive) return

    const gameLoop = setInterval(() => {
      setGameState(prev => {
        const newState = { ...prev }
        
        // Use dynamic dimensions
        const arenaWidth = arenaDimensions.width
        const arenaHeight = arenaDimensions.height
        const paddleHeight = 80
        const ballSize = 12
        const paddleWidth = 8
        
        // Move left paddle (Player 1)
        if (keys['w'] && newState.leftPaddle.y > 0) {
          newState.leftPaddle.y -= 5
        }
        if (keys['s'] && newState.leftPaddle.y < arenaHeight - paddleHeight) {
          newState.leftPaddle.y += 5
        }

        // AI for right paddle (Computer Player)
        const paddleCenter = newState.rightPaddle.y + paddleHeight / 2
        const ballCenter = newState.ball.y + ballSize / 2
        const aiSpeed = 3.2
        const aiDeadZone = 18
        
        // Add some unpredictability
        const aiRandomness = (Math.random() - 0.5) * 2
        const aiError = aiRandomness * 3
        const targetY = ballCenter + aiError
        
        // Only move AI paddle when ball is moving towards it
        if (newState.ball.dx > 0) { // ball moving right towards AI
          if (targetY < paddleCenter - aiDeadZone && newState.rightPaddle.y > 0) {
            newState.rightPaddle.y -= aiSpeed
          } else if (targetY > paddleCenter + aiDeadZone && newState.rightPaddle.y < arenaHeight - paddleHeight) {
            newState.rightPaddle.y += aiSpeed
          }
        }

        // Keep paddles within bounds
        newState.leftPaddle.y = Math.max(0, Math.min(arenaHeight - paddleHeight, newState.leftPaddle.y))
        newState.rightPaddle.y = Math.max(0, Math.min(arenaHeight - paddleHeight, newState.rightPaddle.y))

        // Move ball
        newState.ball.x += newState.ball.dx
        newState.ball.y += newState.ball.dy

        // Ball collision with top/bottom walls
        if (newState.ball.y <= 0 || newState.ball.y >= arenaHeight - ballSize) {
          newState.ball.dy = -newState.ball.dy
          newState.ball.y = Math.max(0, Math.min(arenaHeight - ballSize, newState.ball.y))
        }

        // Ball collision with left paddle
        if (newState.ball.x <= 10 + paddleWidth && 
            newState.ball.x >= 10 &&
            newState.ball.y + ballSize >= newState.leftPaddle.y && 
            newState.ball.y <= newState.leftPaddle.y + paddleHeight) {
          newState.ball.dx = Math.abs(newState.ball.dx) // ensure it goes right
          newState.ball.x = 10 + paddleWidth + 1
        }
        
        // Ball collision with right paddle
        if (newState.ball.x + ballSize >= arenaWidth - 10 - paddleWidth && 
            newState.ball.x <= arenaWidth - 10 &&
            newState.ball.y + ballSize >= newState.rightPaddle.y && 
            newState.ball.y <= newState.rightPaddle.y + paddleHeight) {
          newState.ball.dx = -Math.abs(newState.ball.dx) // ensure it goes left
          newState.ball.x = arenaWidth - 10 - paddleWidth - ballSize - 1
        }

        // Scoring
        if (newState.ball.x < -ballSize) {
          newState.score.right += 1
          newState.ball = { 
            x: arenaWidth / 2, 
            y: arenaHeight / 2, 
            dx: 3, 
            dy: (Math.random() - 0.5) * 4 
          }
        }
        if (newState.ball.x > arenaWidth + ballSize) {
          newState.score.left += 1
          newState.ball = { 
            x: arenaWidth / 2, 
            y: arenaHeight / 2, 
            dx: -3, 
            dy: (Math.random() - 0.5) * 4 
          }
        }

        return newState
      })
    }, 16) // ~60 FPS

    return () => clearInterval(gameLoop)
  }, [showGameModal, gameState.gameActive, keys, arenaDimensions])

  return (
    <div 
      className="retro-container" 
      tabIndex={0} 
      onClick={(e) => e.currentTarget.focus()}
      style={{ outline: 'none' }}
    >
      <div className="scanlines"></div>
      <div className="terminal">
        <div className="terminal-header">
          <span className="terminal-title">████ 8-BIT TERMINAL v1.0 ████</span>
        </div>
        <div className="terminal-content">
          <div className="ascii-art">
            <pre>{`
   █████   ██████  ██ ████████ 
  ██   ██  ██   ██ ██    ██    
   █████   ██████  ██    ██    
  ██   ██  ██   ██ ██    ██    
   █████   ██████  ██    ██    
            `}</pre>
          </div>
          <div className="welcome-text">
            <h1 className="pixel-text">
              {displayText}
              <span className={`cursor ${showCursor ? 'visible' : 'hidden'}`}>█</span>
            </h1>
          </div>
          <div className="menu">
            <div className="menu-item" onClick={startGame}>
              <span className="menu-bracket">[</span>
              <span className="menu-option">ENTER</span>
              <span className="menu-bracket">]</span>
              <span className="menu-text">PING PONG GAME</span>
            </div>
            <div className="menu-item">
              <span className="menu-bracket">[</span>
              <span className="menu-option">ESC</span>
              <span className="menu-bracket">]</span>
              <span className="menu-text">QUIT GAME</span>
            </div>
          </div>
          <div className="status-bar">
            <div className="status-item">HP: ████████████ 100%</div>
            <div className="status-item">MP: ████████████ 100%</div>
            <div className="status-item">LVL: 01</div>
          </div>
        </div>
      </div>

      {/* Game Modal */}
      {showGameModal && (
        <div className="game-modal-overlay">
          <div className="game-modal">
            <div className="game-header">
              <h2>████ 8-BIT PING PONG ████</h2>
              <div className="game-score">
                <span>PLAYER: {gameState.score.left}</span>
                <span>COMPUTER: {gameState.score.right}</span>
              </div>
            </div>
            
            <div className="game-arena" ref={gameArenaRef}>
              {/* Left Paddle */}
              <div 
                className="paddle left-paddle"
                style={{ 
                  top: `${gameState.leftPaddle.y}px`,
                  left: '10px'
                }}
              ></div>
              
              {/* Right Paddle */}
              <div 
                className="paddle right-paddle"
                style={{ 
                  top: `${gameState.rightPaddle.y}px`,
                  right: '10px'
                }}
              ></div>
              
              {/* Ball */}
              <div 
                className="ball"
                style={{ 
                  left: `${gameState.ball.x}px`,
                  top: `${gameState.ball.y}px`
                }}
              ></div>
              
              {/* Center line */}
              <div className="center-line"></div>
            </div>
            
            <div className="game-controls">
              <div className="control-group">
                <span className="player-label">PLAYER</span>
                <div className="controls">
                  <span>[W] UP</span>
                  <span>[S] DOWN</span>
                </div>
              </div>
              <div className="control-group">
                <span className="player-label">COMPUTER</span>
                <div className="controls">
                  <span>🤖 AI</span>
                  <span>AUTO</span>
                </div>
              </div>
            </div>
            
            <div className="game-footer">
              <span className="menu-bracket">[</span>
              <span className="menu-option">ESC</span>
              <span className="menu-bracket">]</span>
              <span className="menu-text">RETURN TO MENU</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
