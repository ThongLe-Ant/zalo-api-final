import { PriceData, PriceChange } from './price-storage';

/**
 * Format số với dấu phẩy
 * Ví dụ: 2329000 → "2,329,000"
 */
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format phần trăm
 * Ví dụ: 0.8567 → "0.86%"
 */
function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Lấy icon dựa trên hướng thay đổi
 */
function getDirectionIcon(direction?: 'up' | 'down' | 'same'): string {
  switch (direction) {
    case 'up':
      return '📈';
    case 'down':
      return '📉';
    case 'same':
      return '➡️';
    default:
      return '';
  }
}

/**
 * Tạo template tin nhắn chuyên nghiệp với tất cả sản phẩm
 */
export function createPriceMessage(priceData: PriceData, priceChange: PriceChange, previousPrice?: PriceData | null): string {
  const { 
    productName, 
    buyPrice, 
    sellPrice, 
    unit = 'Vnđ/Lượng',
    category,
    updateTime, 
    lastDate, 
    lastTime,
    allProducts 
  } = priceData;
  
  const {
    buyPriceChange,
    sellPriceChange,
    buyPricePercent,
    sellPricePercent,
    buyPriceDirection,
    sellPriceDirection,
    hasChanged,
  } = priceChange;

  let message = '╔═══════════════════════════════════════╗\n';
  message += '║   📊 BẢNG GIÁ BẠC CẬP NHẬT   ║\n';
  message += '╚═══════════════════════════════════════╝\n\n';

  // Thời gian cập nhật
  if (updateTime) {
    message += `🕐 Cập nhật: ${updateTime}\n`;
  } else if (lastDate && lastTime) {
    message += `🕐 Cập nhật: ${lastDate} ${lastTime}\n`;
  }
  
  const now = new Date();
  const sendTime = now.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  message += `📤 Gửi lúc: ${sendTime}\n\n`;

  // Nếu có tất cả sản phẩm, hiển thị bảng đầy đủ
  if (allProducts && allProducts.length > 0) {
    // Nhóm theo category
    const productsByCategory = allProducts.reduce((acc, product) => {
      const cat = product.category || 'KHÁC';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(product);
      return acc;
    }, {} as Record<string, typeof allProducts>);

    // Hiển thị từng category
    Object.entries(productsByCategory).forEach(([categoryName, products]) => {
      message += `\n${'─'.repeat(40)}\n`;
      message += `🏷️ ${categoryName}\n`;
      message += `${'─'.repeat(40)}\n\n`;

      products.forEach((product, index) => {
        const isSelected = product.productName === productName;
        const prefix = isSelected ? '⭐ ' : '   ';
        
        message += `${prefix}${product.productName}\n`;
        message += `   📦 Đơn vị: ${product.unit}\n`;
        message += `   💰 Mua vào: ${formatNumber(product.buyPrice)} VNĐ\n`;
        
        if (product.sellPrice > 0) {
          message += `   💰 Bán ra:  ${formatNumber(product.sellPrice)} VNĐ\n`;
          
          // Tính chênh lệch
          const spread = product.sellPrice - product.buyPrice;
          const spreadPercent = product.buyPrice > 0 ? (spread / product.buyPrice) * 100 : 0;
          message += `   📊 Chênh lệch: ${formatNumber(spread)} VNĐ (${spreadPercent.toFixed(2)}%)\n`;
        } else {
          message += `   💰 Bán ra:  - (Chỉ mua vào)\n`;
        }

        // Nếu là sản phẩm được theo dõi và có thay đổi
        if (isSelected && hasChanged) {
          if (buyPriceChange !== undefined && buyPricePercent !== undefined) {
            const icon = getDirectionIcon(buyPriceDirection);
            const changeText = buyPriceChange >= 0 
              ? `+${formatNumber(buyPriceChange)}` 
              : formatNumber(buyPriceChange);
            message += `   ${icon} Mua: ${changeText} VNĐ (${formatPercent(buyPricePercent)})\n`;
            
            if (previousPrice) {
              message += `   📉 Giá cũ: ${formatNumber(previousPrice.buyPrice)} VNĐ\n`;
            }
          }
          
          if (sellPriceChange !== undefined && sellPricePercent !== undefined && sellPrice > 0) {
            const icon = getDirectionIcon(sellPriceDirection);
            const changeText = sellPriceChange >= 0 
              ? `+${formatNumber(sellPriceChange)}` 
              : formatNumber(sellPriceChange);
            message += `   ${icon} Bán: ${changeText} VNĐ (${formatPercent(sellPricePercent)})\n`;
            
            if (previousPrice) {
              message += `   📉 Giá cũ: ${formatNumber(previousPrice.sellPrice)} VNĐ\n`;
            }
          }
        }

        if (index < products.length - 1) {
          message += '\n';
        }
      });
    });
  } else {
    // Fallback: Hiển thị sản phẩm đơn lẻ (backward compatible)
    if (productName) {
      message += `🏷️ Sản phẩm: ${productName}\n`;
      if (category) {
        message += `📂 Danh mục: ${category}\n`;
      }
      message += `📦 Đơn vị: ${unit}\n\n`;
    }

    message += `💰 GIÁ MUA VÀO\n`;
    message += `   ${formatNumber(buyPrice)} VNĐ\n`;
    
    if (buyPriceChange !== undefined && buyPricePercent !== undefined && hasChanged) {
      const icon = getDirectionIcon(buyPriceDirection);
      const changeText = buyPriceChange >= 0 
        ? `+${formatNumber(buyPriceChange)}` 
        : formatNumber(buyPriceChange);
      message += `   ${icon} Thay đổi: ${changeText} VNĐ (${formatPercent(buyPricePercent)})\n`;
      
      if (previousPrice) {
        message += `   📉 Giá cũ: ${formatNumber(previousPrice.buyPrice)} VNĐ\n`;
      }
    }
    message += '\n';

    message += `💰 GIÁ BÁN RA\n`;
    message += `   ${formatNumber(sellPrice)} VNĐ\n`;
    
    if (sellPriceChange !== undefined && sellPricePercent !== undefined && hasChanged) {
      const icon = getDirectionIcon(sellPriceDirection);
      const changeText = sellPriceChange >= 0 
        ? `+${formatNumber(sellPriceChange)}` 
        : formatNumber(sellPriceChange);
      message += `   ${icon} Thay đổi: ${changeText} VNĐ (${formatPercent(sellPricePercent)})\n`;
      
      if (previousPrice) {
        message += `   📉 Giá cũ: ${formatNumber(previousPrice.sellPrice)} VNĐ\n`;
      }
    }
    message += '\n';

    // Chênh lệch giá
    const spread = sellPrice - buyPrice;
    const spreadPercent = buyPrice > 0 ? (spread / buyPrice) * 100 : 0;
    message += `📈 CHÊNH LỆCH\n`;
    message += `   ${formatNumber(spread)} VNĐ (${spreadPercent.toFixed(2)}%)\n`;
  }

  // Footer
  message += `\n${'─'.repeat(40)}\n`;
  message += `💡 Đơn giá đã bao gồm thuế GTGT\n`;
  message += `📱 Thông báo tự động từ hệ thống\n`;
  message += `${'═'.repeat(40)}`;

  return message;
}
