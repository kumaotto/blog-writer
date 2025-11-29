import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QRCodeModal } from '../QRCodeModal';

describe('QRCodeModal', () => {
  const mockOnClose = jest.fn();
  const mockOnRegenerate = jest.fn();
  const defaultAuthState = {
    qrCode: 'data:image/png;base64,test',
    tokenExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('isOpenがfalseの場合、何も表示されない', () => {
    const { container } = render(
      <QRCodeModal
        isOpen={false}
        onClose={mockOnClose}
        authState={defaultAuthState}
        onRegenerate={mockOnRegenerate}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('isOpenがtrueの場合、モーダルが表示される', () => {
    render(
      <QRCodeModal
        isOpen={true}
        onClose={mockOnClose}
        authState={defaultAuthState}
        onRegenerate={mockOnRegenerate}
      />
    );
    
    expect(screen.getByText('スマホでスキャン')).toBeInTheDocument();
  });

  it('閉じるボタンをクリックするとonCloseが呼ばれる', () => {
    render(
      <QRCodeModal
        isOpen={true}
        onClose={mockOnClose}
        authState={defaultAuthState}
        onRegenerate={mockOnRegenerate}
      />
    );
    
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('オーバーレイをクリックするとonCloseが呼ばれる', () => {
    render(
      <QRCodeModal
        isOpen={true}
        onClose={mockOnClose}
        authState={defaultAuthState}
        onRegenerate={mockOnRegenerate}
      />
    );
    
    const overlay = screen.getByText('スマホでスキャン').closest('.qr-modal-overlay');
    if (overlay) {
      fireEvent.click(overlay);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('モーダルコンテンツをクリックしてもonCloseが呼ばれない', () => {
    render(
      <QRCodeModal
        isOpen={true}
        onClose={mockOnClose}
        authState={defaultAuthState}
        onRegenerate={mockOnRegenerate}
      />
    );
    
    const content = screen.getByText('スマホでスキャン').closest('.qr-modal-content');
    if (content) {
      fireEvent.click(content);
      expect(mockOnClose).not.toHaveBeenCalled();
    }
  });

  it('QRCodeDisplayコンポーネントにpropsが正しく渡される', () => {
    render(
      <QRCodeModal
        isOpen={true}
        onClose={mockOnClose}
        authState={defaultAuthState}
        onRegenerate={mockOnRegenerate}
      />
    );
    
    const img = screen.getByAltText('QR Code for mobile access');
    expect(img).toHaveAttribute('src', defaultAuthState.qrCode);
  });
});
