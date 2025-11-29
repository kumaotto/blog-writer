import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QRCodeDisplay } from '../QRCodeDisplay';

describe('QRCodeDisplay', () => {
  const mockOnRegenerate = jest.fn();
  const defaultAuthState = {
    qrCode: 'data:image/png;base64,test',
    tokenExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('QRコードが表示される', () => {
    render(<QRCodeDisplay authState={defaultAuthState} onRegenerate={mockOnRegenerate} />);
    
    const img = screen.getByAltText('QR Code for mobile access');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', defaultAuthState.qrCode);
  });

  it('QRコードがnullの場合、プレースホルダーが表示される', () => {
    const authState = { qrCode: null, tokenExpiresAt: null };
    render(<QRCodeDisplay authState={authState} onRegenerate={mockOnRegenerate} />);
    
    expect(screen.getByText('QRコードを生成中...')).toBeInTheDocument();
  });

  it('初期タイマーが5:00で表示される', () => {
    render(<QRCodeDisplay authState={defaultAuthState} onRegenerate={mockOnRegenerate} />);
    
    expect(screen.getByText('5:00')).toBeInTheDocument();
  });

  it('タイマーがカウントダウンする', () => {
    render(<QRCodeDisplay authState={defaultAuthState} onRegenerate={mockOnRegenerate} />);
    
    expect(screen.getByText('5:00')).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('4:59')).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(59000);
    });
    expect(screen.getByText('4:00')).toBeInTheDocument();
  });

  it('タイマーが0になると期限切れ表示になる', () => {
    render(<QRCodeDisplay authState={defaultAuthState} onRegenerate={mockOnRegenerate} />);
    
    act(() => {
      jest.advanceTimersByTime(300000); // 5 minutes
    });
    
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText('期限切れ')).toBeInTheDocument();
  });

  it('再生成ボタンをクリックするとonRegenerateが呼ばれる', () => {
    render(<QRCodeDisplay authState={defaultAuthState} onRegenerate={mockOnRegenerate} />);
    
    const button = screen.getByRole('button', { name: /QRコード再生成/ });
    fireEvent.click(button);
    
    expect(mockOnRegenerate).toHaveBeenCalledTimes(1);
  });

  it('QRコードが変更されるとタイマーがリセットされる', () => {
    const { rerender } = render(
      <QRCodeDisplay authState={defaultAuthState} onRegenerate={mockOnRegenerate} />
    );
    
    act(() => {
      jest.advanceTimersByTime(60000); // 1 minute
    });
    expect(screen.getByText('4:00')).toBeInTheDocument();
    
    const newAuthState = {
      qrCode: 'data:image/png;base64,newtest',
      tokenExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };
    
    rerender(<QRCodeDisplay authState={newAuthState} onRegenerate={mockOnRegenerate} />);
    
    expect(screen.getByText('5:00')).toBeInTheDocument();
  });

  it('再生成ボタンをクリックするとタイマーがリセットされる', () => {
    render(<QRCodeDisplay authState={defaultAuthState} onRegenerate={mockOnRegenerate} />);
    
    act(() => {
      jest.advanceTimersByTime(60000); // 1 minute
    });
    expect(screen.getByText('4:00')).toBeInTheDocument();
    
    const button = screen.getByRole('button', { name: /QRコード再生成/ });
    
    act(() => {
      fireEvent.click(button);
    });
    
    expect(mockOnRegenerate).toHaveBeenCalledTimes(1);
    expect(screen.getByText('5:00')).toBeInTheDocument();
  });
});
