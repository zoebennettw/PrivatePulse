import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="pp-header">
      <div className="pp-header-inner">
        <div className="pp-brand">
          <div className="pp-brand-icon" aria-hidden="true">
            <span className="pp-brand-pulse" />
          </div>
          <div>
            <h1 className="pp-brand-title">PrivatePulse</h1>
            <p className="pp-brand-subtitle">Encrypted whispers on Sepolia</p>
          </div>
        </div>
        <div className="pp-connect">
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </div>
    </header>
  );
}
