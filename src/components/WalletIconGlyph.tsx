import {
  Banknote,
  Coins,
  CreditCard,
  Landmark,
  Smartphone,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { WalletIcon } from '../types/dayspace';

interface WalletIconGlyphProps {
  icon: WalletIcon;
  className?: string;
}

export function WalletIconGlyph({
  icon,
  className = 'w-4 h-4',
}: WalletIconGlyphProps) {
  switch (icon) {
    case 'smartphone':
      return <Smartphone className={className} aria-hidden="true" />;
    case 'landmark':
      return <Landmark className={className} aria-hidden="true" />;
    case 'banknote':
      return <Banknote className={className} aria-hidden="true" />;
    case 'credit-card':
      return <CreditCard className={className} aria-hidden="true" />;
    case 'coins':
      return <Coins className={className} aria-hidden="true" />;
    case 'sparkles':
      return <Sparkles className={className} aria-hidden="true" />;
    case 'wallet':
    default:
      return <Wallet className={className} aria-hidden="true" />;
  }
}
