import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY

async function analyzeImage(base64Image) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: 'openrouter/auto',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `你是水果專家。請用繁體中文簡短分析這顆水果，格式如下，每項一行不要廢話：
🍎 水果：xxx

🌡️ 成熟度：xx%

✨ 新鮮度：xx%

⚠️ 瑕疵：有／無（一句話說明）

✅ 建議：該買／不該買（一句話原因）`
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` }
          }
        ]
      }]
    })
  })
  const data = await response.json()
  if (!data.choices) return '分析失敗：' + (data.error?.message || '未知錯誤')
  return data.choices[0].message.content
}

function App() {
  const [image, setImage] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

async function startCamera(facingMode = 'environment') {
  setCameraOn(true)
  setResult(null)
  setImage(null)
  setTimeout(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode }
    })
    streamRef.current = stream
    videoRef.current.srcObject = stream
  }, 100)
}

async function switchCamera() {
  const currentFacing = streamRef.current
    ?.getVideoTracks()[0]
    ?.getSettings().facingMode
  stopCamera()
  setTimeout(() => {
    startCamera(currentFacing === 'environment' ? 'user' : 'environment')
  }, 300)
}


  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setCameraOn(false)
  }

  async function takePhoto() {
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg')
    setImage(dataUrl)
    stopCamera()
    const base64 = dataUrl.split(',')[1]
    setLoading(true)
    const analysis = await analyzeImage(base64)
    setResult(analysis)
    setLoading(false)
  }

  function handleUpload(e) {
    const file = e.target.files[0]
    const url = URL.createObjectURL(file)
    setImage(url)
    setResult(null)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      setLoading(true)
      const analysis = await analyzeImage(base64)
      setResult(analysis)
      setLoading(false)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0fdf4',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      fontFamily: 'sans-serif'
    }}>
      <h1 style={{ fontSize: '2rem', color: '#15803d', marginBottom: '8px' }}>
         水果新鮮度分析
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        上傳照片或開啟鏡頭，AI 幫你判斷新鮮度
      </p>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <label style={{
          cursor: 'pointer',
          background: '#16a34a',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '999px',
          fontSize: '1rem'
        }}>
          📁 上傳照片
          <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
        </label>

        {!cameraOn ? (
          <button onClick={startCamera} style={{
            cursor: 'pointer',
            background: '#0891b2',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '999px',
            fontSize: '1rem',
            border: 'none'
          }}>
            📷 開啟鏡頭
          </button>
        ) : (
          <button onClick={stopCamera} style={{
            cursor: 'pointer',
            background: '#dc2626',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '999px',
            fontSize: '1rem',
            border: 'none'
          }}>
            ✕ 關閉鏡頭
          </button>
        )}
      </div>

      {cameraOn && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <video ref={videoRef} autoPlay style={{
            width: '320px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }} />
          <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={takePhoto} style={{
            background: '#16a34a',
            color: 'white',
            padding: '14px 36px',
            borderRadius: '999px',
            fontSize: '1.1rem',
            border: 'none',
            cursor: 'pointer'
          }}>
            📸 拍照分析
          </button>
          <button onClick={switchCamera} style={{
            background: '#6b7280',
            color: 'white',
            padding: '14px 20px',
            borderRadius: '999px',
            fontSize: '1.1rem',
            border: 'none',
            cursor: 'pointer'
          }}>
            🔄
          </button>
        </div>
                </div>
              )}

      {image && !cameraOn && (
        <img src={image} style={{
          width: '280px',
          height: '280px',
          objectFit: 'cover',
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }} />
      )}

      {loading && (
        <p style={{ color: '#16a34a', fontSize: '1.1rem' }}>🔍 AI 分析中...</p>
      )}

      {result && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          lineHeight: '1.8'
        }}>
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export default App