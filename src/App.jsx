import { useState, useEffect, useRef } from 'react';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0);
  const [bassLevel, setBassLevel] = useState(0);
  const [highLevel, setHighLevel] = useState(0);
  const [beat, setBeat] = useState(false);
  const [offsets, setOffsets] = useState([]);
  const [isLandscape, setIsLandscape] = useState(false);
  const [transcript, setTranscript] = useState('SPEAK');
  const [mode, setMode] = useState('speech');
  const [textIndex, setTextIndex] = useState(0);
  const [freqText, setFreqText] = useState('LISTEN');
  
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const prevVolumeRef = useRef(0);
  const prevBassRef = useRef(0);
  const prevHighRef = useRef(0);
  const recognitionRef = useRef(null);
  const modeRef = useRef(mode);
  
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  
  const texts = [
    "THE PUNCTUM\nIS A STING",
    "THERE IS NOTHING\nOUTSIDE THE TEXT",
    "DESIRE IS\nA MACHINE"
  ];

  const speechKeywordImages = {
  'MAYA': '/images/maya.png',
  'NICO': '/images/nico.png',
  'HE': '/images/he.png',
  'HIS': '/images/he.png',
};

  const detectSpeechKeyword = (text) => {
  for (const keyword of Object.keys(speechKeywordImages)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(text)) {
      return keyword;
    }
  }
  return null;
};
  
  const maxCharsPerLine = 16;
  const maxLines = 3;

  const addLineBreaks = (str) => {
    const words = str.split(' ');
    let lines = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + ' ' + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    if (lines.length > maxLines) {
      lines = lines.slice(-maxLines);
    }
    
    return lines.join('\n');
  };

  const getText = () => {
    if (mode === 'preset') return texts[textIndex];
    if (mode === 'speech') return addLineBreaks(transcript);
    if (mode === 'frequency') return freqText;
    return '';
  };

  const text = getText();
  const chars = text.split('');
  
  const presetShowImage = mode === 'preset' && textIndex === 2;
  const speechKeyword = mode === 'speech' ? detectSpeechKeyword(transcript) : null;
  const speechShowImage = mode === 'speech' && speechKeyword;
  const showImage = presetShowImage || speechShowImage;
  
  const getCurrentImage = () => {
    if (presetShowImage) return '/images/1.png';
    if (speechShowImage) return speechKeywordImages[speechKeyword];
    return null;
  };
  const currentImage = getCurrentImage();

  const beatThreshold = 0.025;
  const shakeIntensity = 30;

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  useEffect(() => {
    setOffsets(chars.map(() => ({ x: 0, y: 0 })));
  }, [text]);

  const setupSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      return null;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      let newText = (finalTranscript || interimTranscript).toUpperCase().trim();

// 単語の置き換え
const substitutions = {
  'DEFEND': 'HIDE',
  'DEFENDS': 'HIDES',
  'DEFENDED': 'HID',
  'DEFENDING': 'HIDING',
  'PROTECT': 'RESTRICT',
  'PROTECTS': 'RESTRICTS',
  'PROTECTED': 'RESTRICTED',
  'PROTECTING': 'RESTRICTING',
  'SECURITY': 'SURVEILLANCE',
};

Object.keys(substitutions).forEach(word => {
  const regex = new RegExp(`\\b${word}\\b`, 'g');
  newText = newText.replace(regex, substitutions[word]);
});

if (newText) {
  setTranscript(newText);
}
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };
    
    recognition.onend = () => {
      if (modeRef.current === 'speech') {
        try {
          recognition.start();
        } catch (e) {}
      }
    };
    
    return recognition;
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 512;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const recognition = setupSpeechRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        recognition.start();
      }
      
      setIsListening(true);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkVolume = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedVolume = average / 255;
        setVolume(normalizedVolume);
        
        const bassRange = dataArray.slice(0, 10);
        const bassAvg = bassRange.reduce((a, b) => a + b) / bassRange.length / 255;
        setBassLevel(bassAvg);
        
        const highRange = dataArray.slice(40, 80);
        const highAvg = highRange.reduce((a, b) => a + b) / highRange.length / 255;
        setHighLevel(highAvg);
        
        const volumeJump = normalizedVolume - prevVolumeRef.current;
        
        const currentMode = modeRef.current;
        
        if (currentMode === 'frequency') {
          const bassStrong = bassAvg > 0.2;
          const highStrong = highAvg > 0.02;

          let newFreqText = '...';

          if (bassStrong && bassAvg > highAvg * 5) {
            newFreqText = 'BASS';
          } else if (highStrong && highAvg > bassAvg * 0.2) {
            newFreqText = 'HIGH';
          } else if (bassStrong || highStrong) {
            newFreqText = 'MIX';
          }

          setFreqText(prev => {
            if (prev !== newFreqText) {
              setBeat(true);
              setTimeout(() => setBeat(false), 100);
            }
            return newFreqText;
          });
        } else if (volumeJump > beatThreshold) {
          setBeat(true);
          
          if (currentMode === 'preset') {
            setTextIndex(prev => (prev + 1) % texts.length);
          }
          
          setTimeout(() => setBeat(false), 50);
        }
        
        prevVolumeRef.current = normalizedVolume;
        prevBassRef.current = bassAvg;
        prevHighRef.current = highAvg;
        requestAnimationFrame(checkVolume);
      };
      
      checkVolume();
      
    } catch (e) {
      console.error('Microphone access denied:', e);
    }
  };

  useEffect(() => {
    if (!isListening || !recognitionRef.current) return;
    
    if (mode === 'speech') {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    } else {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }, [mode, isListening]);

  useEffect(() => {
    if (beat && chars.length > 0) {
      const intensity = mode === 'frequency' ? shakeIntensity * 0.3 : shakeIntensity;
      const newOffsets = [];
      for (let i = 0; i < chars.length; i++) {
        newOffsets.push({
          x: (Math.random() - 0.5) * intensity * (1 + volume * 3),
          y: (Math.random() - 0.5) * intensity * (1 + volume * 3),
        });
      }
      setOffsets(newOffsets);
      
      setTimeout(() => {
        setOffsets(prev => prev.map(() => ({ x: 0, y: 0 })));
      }, 100);
    }
  }, [beat]);

  // 80vw / 16文字 = 5vw per character
  const fontSize = '9vw';

  const lineHeight = 0.9;
  const letterSpacing = '-0.02em';

  const cycleMode = () => {
    if (mode === 'speech') setMode('frequency');
    else if (mode === 'frequency') setMode('preset');
    else setMode('speech');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'black',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {!isListening && (
        <button
          onClick={startListening}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            padding: '12px 24px',
            backgroundColor: 'white',
            color: 'black',
            fontFamily: '"OTR Grotesk", system-ui, sans-serif',
            fontSize: 14,
            letterSpacing: '0.05em',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          TAP TO START
        </button>
      )}

      {isListening && showImage && currentImage && (
        <div style={{
          position: 'absolute',
          width: '60vw',
          height: '60vh',
          zIndex: 1,
        }}>
          <img
            src={currentImage}
            alt="Image"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </div>
      )}

      {isListening && (
        <div style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          //mixBlendMode: 'difference',
        }}>
          {text.split('\n').map((line, lineIndex) => (
            <div 
              key={lineIndex}
              style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                padding: 0,
                margin: 0,
                lineHeight: lineHeight,
              }}
            >
              {line.split('').map((char, charIndex) => {
                const prevCharsCount = text.split('\n')
                  .slice(0, lineIndex)
                  .reduce((sum, l) => sum + l.length + 1, 0);
                const i = prevCharsCount + charIndex;
                
                return (
                  <span
                    key={`${lineIndex}-${charIndex}`}
                    style={{
                      fontSize: fontSize,
                      fontFamily: '"OTR Grotesk", system-ui, sans-serif',
                      fontWeight: 900,
                      color: 'blue',
                      display: 'inline-block',
                      transform: `translate(${offsets[i]?.x || 0}px, ${offsets[i]?.y || 0}px)`,
                      transition: beat ? 'none' : 'transform 0.1s ease-out',
                      textShadow: 'none',
                      whiteSpace: 'pre',
                      lineHeight: lineHeight,
                      letterSpacing: letterSpacing,
                      mixBlendMode: 'difference',
                    }}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {isListening && (
        <button
          onClick={cycleMode}
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            padding: '8px 16px',
            backgroundColor: mode === 'frequency' ? 'rgba(100,100,255,0.3)' : mode === 'speech' ? 'rgba(255,100,100,0.3)' : 'rgba(255,255,255,0.1)',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: 12,
            border: '1px solid rgba(255,255,255,0.3)',
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          {mode.toUpperCase()}
        </button>
      )}

      <button
        onClick={() => setIsLandscape(!isLandscape)}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '8px 16px',
          backgroundColor: 'rgba(255,255,255,0.0)',
          color: 'white',
          fontFamily: 'monospace',
          fontSize: 12,
          border: 'none',
          cursor: 'pointer',
          zIndex: 10,
        }}
      >
        {isLandscape ? 'PORTRAIT' : 'LANDSCAPE'}
      </button>

      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'monospace',
        fontSize: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        zIndex: 10,
      }}>
        <span>vol: {(volume * 100).toFixed(0)}%</span>
        <span>bass: {(bassLevel * 100).toFixed(0)}%</span>
        <span>high: {(highLevel * 100).toFixed(0)}%</span>
        <span>mode: {mode}</span>
        {speechKeyword && <span>keyword: {speechKeyword}</span>}
      </div>

      <div style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        display: 'flex',
        flexDirection: 'row',
        gap: 4,
        zIndex: 10,
      }}>
        <div style={{
          height: 100,
          width: 8,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 4,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            bottom: 0,
            height: `${bassLevel * 100}%`,
            width: '100%',
            backgroundColor: 'rgba(255,255,255,0.5)',
            borderRadius: 4,
            transition: 'height 0.05s',
          }} />
        </div>
        <div style={{
          height: 100,
          width: 8,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 4,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            bottom: 0,
            height: `${highLevel * 100}%`,
            width: '100%',
            backgroundColor: 'rgba(255,255,255,0.5)',
            borderRadius: 4,
            transition: 'height 0.05s',
          }} />
        </div>
      </div>
    </div>
  );
}

export default App;