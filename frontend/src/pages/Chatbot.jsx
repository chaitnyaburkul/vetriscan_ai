import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { chatAPI, userAPI } from '../api'
import { FiSend, FiMessageSquare, FiUser, FiTrash2, FiMic, FiMicOff } from 'react-icons/fi'
import { GiCow } from 'react-icons/gi'
import styles from './Chatbot.module.css'

const SUGGESTIONS = {
  en: [
    'What are symptoms of Lumpy Skin Disease?',
    'How to prevent Foot and Mouth Disease?',
    'My cow has swollen udder, what to do?',
    'What vaccines should I give my cattle?',
    'How to treat Blackleg in cattle?',
    'What causes milk fever in cows?',
  ],
  hi: [
    'लम्पी स्किन रोग के लक्षण क्या हैं?',
    'खुरपका-मुंहपका रोग से कैसे बचाएं?',
    'मेरी गाय का थन सूज गया है, क्या करें?',
    'पशुओं को कौन से टीके लगवाने चाहिए?',
    'ब्लैकलेग का इलाज कैसे करें?',
    'गाय में मिल्क फीवर क्यों होता है?',
  ],
  mr: [
    'लम्पी स्किन रोगाची लक्षणे काय आहेत?',
    'तोंड व खुर रोग कसा टाळावा?',
    'माझ्या गायीचे कास सुजले आहे, काय करावे?',
    'जनावरांना कोणती लस द्यावी?',
    'ब्लॅकलेगवर उपचार कसा करावा?',
    'गायीला मिल्क फीवर का होतो?',
  ],
}

const GREETINGS = {
  en: 'Hello! I am VetriBot, your AI cattle health assistant. Ask me anything about cattle diseases, symptoms, prevention, and treatment.',
  hi: 'नमस्ते! मैं VetriBot हूँ, आपका AI पशु स्वास्थ्य सहायक। पशु रोग, लक्षण, रोकथाम और उपचार के बारे में कुछ भी पूछें।',
  mr: 'नमस्कार! मी VetriBot आहे, तुमचा AI पशु आरोग्य सहाय्यक. पशु रोग, लक्षणे, प्रतिबंध आणि उपचारांबद्दल काहीही विचारा.',
}

export default function Chatbot() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [messages, setMessages] = useState([
    { role: 'assistant', content: GREETINGS[lang] || GREETINGS.en }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const prevLang = useRef(lang)

  // Voice input setup
  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) { alert('Voice input not supported in this browser. Use Chrome.'); return }
    const rec = new SpeechRecognition()
    rec.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : 'en-IN'
    rec.interimResults = false
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(prev => prev + transcript)
      setListening(false)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  const stopVoice = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  // Reset chat when language changes
  useEffect(() => {
    if (prevLang.current !== lang) {
      prevLang.current = lang
      setMessages([{ role: 'assistant', content: GREETINGS[lang] || GREETINGS.en }])
    }
  }, [lang])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    const newMsgs = [...messages, { role: 'user', content: msg }]
    setMessages(newMsgs)
    setLoading(true)
    try {
      const res = await chatAPI.chat({ message: msg, language: lang, history: messages.slice(-10) })
      setMessages([...newMsgs, { role: 'assistant', content: res.data.response }])
    } catch {
      setMessages([...newMsgs, { role: 'assistant', content: 'Unable to connect. Please try again.' }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.botAvatar}>
            <GiCow size={22} />
          </div>
          <div>
            <div className={styles.headerTitle}>VetriBot</div>
            <div className={styles.headerSub}>AI Cattle Health Assistant</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.onlineDot} />
          <span className={styles.onlineText}>Online</span>
        </div>
      </div>

      {/* Suggestions */}
      <div className={styles.suggestionsSection}>
        <div className={styles.suggestionsLabel}>
          <FiMessageSquare size={13} /> Suggested Questions
        </div>
        <div className={styles.suggestions}>
          {(SUGGESTIONS[lang] || SUGGESTIONS.en).map((s, i) => (
            <button key={i} className={styles.suggestion} onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className={styles.chatBox}>
        {messages.map((m, i) => {
          const isBot = m.role === 'assistant'
          return (
            <div key={i} className={`${styles.msgRow} ${isBot ? styles.botRow : styles.userRow}`}>
              {isBot && (
                <div className={styles.botAvatarSmall}>
                  <GiCow size={14} />
                </div>
              )}
              <div className={`${styles.bubble} ${isBot ? styles.botBubble : styles.userBubble}`}>
                {isBot && <div className={styles.bubbleSender}>VetriBot</div>}
                <div className={styles.bubbleText}>{m.content}</div>
              </div>
              {!isBot && (
                <div className={styles.userAvatarSmall}>
                  <FiUser size={14} />
                </div>
              )}
            </div>
          )
        })}

        {loading && (
          <div className={`${styles.msgRow} ${styles.botRow}`}>
            <div className={styles.botAvatarSmall}><GiCow size={14} /></div>
            <div className={`${styles.bubble} ${styles.botBubble}`}>
              <div className={styles.typingDots}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={t('type_message')}
            rows={1}
          />
          <button
            className={`${styles.micBtn} ${listening ? styles.micActive : ''}`}
            onClick={listening ? stopVoice : startVoice}
            title={listening ? 'Stop listening' : 'Voice input'}
            type="button"
          >
            {listening ? <FiMicOff size={15} /> : <FiMic size={15} />}
          </button>
          <button
            className={styles.sendBtn}
            onClick={() => send()}
            disabled={loading || !input.trim()}
          >
            <FiSend size={16} />
          </button>
        </div>
        <div className={styles.inputHint}>
          Press Enter to send · Shift+Enter for new line
          {listening && <span className={styles.listeningText}> · Listening...</span>}
        </div>
      </div>
    </div>
  )
}
