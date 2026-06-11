"use client";
import { useEffect, useRef } from 'react';

export default function TelegramLoginWidget({ botName, onAuth }) {
  const containerRef = useRef(null);

  useEffect(() => {
    // Define global callback function for the widget
    window.TelegramLoginWidget = {
      dataOnauth: (user) => {
        if (onAuth) onAuth(user);
      }
    };

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    if (containerRef.current) {
      containerRef.current.innerHTML = ''; // clear any existing widget
      containerRef.current.appendChild(script);
    }
  }, [botName, onAuth]);

  return <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}></div>;
}
