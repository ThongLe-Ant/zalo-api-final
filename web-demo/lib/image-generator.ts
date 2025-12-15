import puppeteer from 'puppeteer';
import { PriceData, PriceChange, getLast3Prices } from './price-storage';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * Format số với dấu phẩy
 */
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}


/**
 * Tạo HTML template chuyên nghiệp cho ảnh giá bạc (theo mẫu Vàng bạc Hoa Vinh)
 */
export async function createPriceImageHTML(priceData: PriceData, priceChange: PriceChange, previousPrice?: PriceData | null): Promise<string> {
  const { 
    productName, 
    unit = 'Vnđ/Lượng',
    updateTime, 
    lastDate, 
    lastTime,
    allProducts,
    buyPrice,
    sellPrice
  } = priceData;

  // Parse thời gian
  const timeParts = updateTime ? updateTime.split(' ') : (lastTime ? [lastDate, lastTime] : ['', '']);
  const updateDate = timeParts[0] || '';
  const updateTimeOnly = timeParts[1] || '';

  // Lấy đơn vị từ unit (Vnđ/Lượng -> LƯỢNG, Vnđ/Kg -> KG)
  const unitDisplay = unit.replace('Vnđ/', '').toUpperCase();

  // Chuẩn bị dữ liệu cho chart (5 giá gần nhất của BẠC MIẾNG PHÚ QUÝ 999 1 LƯỢNG)
  const priceHistory: number[] = [];
  const timeLabels: string[] = [];
  const targetProductName = 'BẠC MIẾNG PHÚ QUÝ 999 1 LƯỢNG';
  
  // Lấy lịch sử giá (tối đa 5 giá gần nhất)
  const last3Prices = await getLast3Prices();
  
  // Lấy giá của sản phẩm cụ thể từ mỗi lần cập nhật
  const extractProductPrice = (priceData: PriceData): number | null => {
    if (priceData.allProducts && priceData.allProducts.length > 0) {
      const product = priceData.allProducts.find(p => {
        const name = p.productName || '';
        return name.includes(targetProductName) || 
               name === targetProductName ||
               targetProductName.includes(name);
      });
      if (product) {
        return product.buyPrice;
      }
      // Nếu không tìm thấy, log để debug
      console.warn(`[Chart] Không tìm thấy sản phẩm "${targetProductName}" trong allProducts:`, 
        priceData.allProducts.map(p => p.productName));
    }
    // Fallback: nếu không có allProducts, dùng buyPrice trực tiếp
    if (priceData.buyPrice) {
      console.log(`[Chart] Fallback: dùng buyPrice trực tiếp = ${priceData.buyPrice}`);
      return priceData.buyPrice;
    }
    return null;
  };
  
  // Sử dụng dữ liệu từ lịch sử, nếu có ít nhất 2 giá thì hiển thị chart
  if (last3Prices.length >= 2) {
    // Sắp xếp theo timestamp (tăng dần - giá cũ nhất trước)
    const sortedPrices = [...last3Prices].sort((a, b) => {
      const timestampA = a.timestamp || (a.updateTime ? new Date(a.updateTime).getTime() : 0);
      const timestampB = b.timestamp || (b.updateTime ? new Date(b.updateTime).getTime() : 0);
      return timestampA - timestampB;
    });
    
    console.log(`[Chart] Sorted prices by timestamp:`, sortedPrices.map((p, i) => ({
      index: i + 1,
      timestamp: p.timestamp,
      updateTime: p.updateTime,
      lastTime: p.lastTime,
    })));
    
    // Lấy 5 giá cuối cùng (hoặc tất cả nếu ít hơn 5)
    const pricesToShow = sortedPrices.slice(-5);
    
    // Điền dữ liệu vào chart (chỉ lấy giá của sản phẩm cụ thể)
    // QUAN TRỌNG: Giữ nguyên thứ tự thời gian (cũ -> mới)
    const chartData: Array<{ price: number; time: string; timestamp: number }> = [];
    
    pricesToShow.forEach((price, index) => {
      const productPrice = extractProductPrice(price);
      
      // Format thời gian: bao gồm ngày/tháng và giờ
      let timeLabel = '';
      
      // Lấy ngày và giờ
      let datePart = '';
      let timePart = '';
      
      if (price.lastDate && price.lastTime) {
        // Có lastDate và lastTime: "14/12/2025" và "12:00"
        datePart = price.lastDate.split('/').slice(0, 2).join('/'); // Lấy "14/12" từ "14/12/2025"
        timePart = price.lastTime;
      } else if (price.updateTime) {
        // updateTime có thể là "13/12/2025 12:00"
        const parts = price.updateTime.split(' ');
        if (parts.length >= 2) {
          const dateStr = parts[0]; // "13/12/2025"
          datePart = dateStr.split('/').slice(0, 2).join('/'); // "13/12"
          timePart = parts[1]; // "12:00"
        } else {
          // Chỉ có giờ
          timePart = price.updateTime;
        }
      } else if (price.lastTime) {
        // Chỉ có lastTime
        timePart = price.lastTime;
      }
      
      // Format label: "14/12 12:00" hoặc chỉ "12:00" nếu không có ngày
      if (datePart && timePart) {
        timeLabel = `${datePart} ${timePart}`;
      } else if (timePart) {
        timeLabel = timePart;
      }
      
      const timestamp = price.timestamp || (price.updateTime ? new Date(price.updateTime).getTime() : 0);
      
      console.log(`[Chart] Price ${index + 1}/${pricesToShow.length}: time=${timeLabel}, timestamp=${timestamp}, price=${productPrice}, hasAllProducts=${!!price.allProducts}`);
      
      if (productPrice !== null) {
        chartData.push({
          price: productPrice,
          time: timeLabel,
          timestamp: timestamp,
        });
      } else {
        console.warn(`[Chart] Failed to extract price for index ${index}:`, {
          hasAllProducts: !!price.allProducts,
          allProductsLength: price.allProducts?.length || 0,
          buyPrice: price.buyPrice,
          updateTime: price.updateTime,
          lastTime: price.lastTime,
        });
      }
    });
    
    // Đảm bảo sắp xếp lại theo timestamp (phòng trường hợp có giá bị skip)
    chartData.sort((a, b) => a.timestamp - b.timestamp);
    
    // Push vào priceHistory và timeLabels theo thứ tự đã sắp xếp
    chartData.forEach(data => {
      priceHistory.push(data.price);
      timeLabels.push(data.time);
    });
    
    console.log(`[Chart] Final order - Prices:`, priceHistory, `Times:`, timeLabels);
    
    // Nếu chưa đủ 5 giá và có giá hiện tại, thêm giá hiện tại vào
    if (priceHistory.length < 5) {
      const currentProductPrice = extractProductPrice(priceData);
      if (currentProductPrice !== null) {
        // Kiểm tra xem giá hiện tại đã có trong priceHistory chưa
        const lastPriceInHistory = priceHistory[priceHistory.length - 1];
        if (currentProductPrice !== lastPriceInHistory) {
          // Format thời gian cho giá hiện tại với ngày/tháng
          let currentTimeLabel = '';
          if (priceData.lastDate && priceData.lastTime) {
            const datePart = priceData.lastDate.split('/').slice(0, 2).join('/');
            currentTimeLabel = `${datePart} ${priceData.lastTime}`;
          } else if (priceData.updateTime) {
            const parts = priceData.updateTime.split(' ');
            if (parts.length >= 2) {
              const datePart = parts[0].split('/').slice(0, 2).join('/');
              currentTimeLabel = `${datePart} ${parts[1]}`;
            } else {
              currentTimeLabel = priceData.updateTime;
            }
          } else {
            currentTimeLabel = priceData.lastTime || '';
          }
          
          priceHistory.push(currentProductPrice);
          timeLabels.push(currentTimeLabel);
        }
      }
    }
    
    // Debug: log số lượng giá đã lấy
    console.log(`[Chart] Total prices in history: ${last3Prices.length}, Prices to show: ${pricesToShow.length}, Extracted: ${priceHistory.length} prices`);
    console.log(`[Chart] Price history array:`, priceHistory);
    console.log(`[Chart] Time labels array (should be in chronological order):`, timeLabels);
    
    // Verify thứ tự thời gian
    if (timeLabels.length > 1) {
      const timeValues = timeLabels.map(t => {
        if (!t) return 0;
        const parts = t.split(':');
        if (parts.length === 2) {
          return parseInt(parts[0]) * 60 + parseInt(parts[1]); // Convert to minutes
        }
        return 0;
      });
      const isAscending = timeValues.every((val, i) => i === 0 || val >= timeValues[i - 1]);
      if (!isAscending) {
        console.warn(`[Chart] WARNING: Time labels are NOT in ascending order!`, timeLabels);
      } else {
        console.log(`[Chart] ✓ Time labels are in ascending order`);
      }
    }
  } else if (last3Prices.length === 1) {
    // Nếu chỉ có 1 giá trong lịch sử, thêm vào
    const productPrice1 = extractProductPrice(last3Prices[0]);
    if (productPrice1 !== null) {
      const price = last3Prices[0];
      let timeLabel = '';
      if (price.lastDate && price.lastTime) {
        const datePart = price.lastDate.split('/').slice(0, 2).join('/');
        timeLabel = `${datePart} ${price.lastTime}`;
      } else if (price.updateTime) {
        const parts = price.updateTime.split(' ');
        if (parts.length >= 2) {
          const datePart = parts[0].split('/').slice(0, 2).join('/');
          timeLabel = `${datePart} ${parts[1]}`;
        } else {
          timeLabel = price.updateTime;
        }
      } else {
        timeLabel = price.lastTime || '';
      }
      
      priceHistory.push(productPrice1);
      timeLabels.push(timeLabel);
    }
    
    // Thêm giá hiện tại nếu khác
    const currentProductPrice = extractProductPrice(priceData);
    if (currentProductPrice !== null && currentProductPrice !== productPrice1) {
      let currentTimeLabel = '';
      if (priceData.lastDate && priceData.lastTime) {
        const datePart = priceData.lastDate.split('/').slice(0, 2).join('/');
        currentTimeLabel = `${datePart} ${priceData.lastTime}`;
      } else if (priceData.updateTime) {
        const parts = priceData.updateTime.split(' ');
        if (parts.length >= 2) {
          const datePart = parts[0].split('/').slice(0, 2).join('/');
          currentTimeLabel = `${datePart} ${parts[1]}`;
        } else {
          currentTimeLabel = priceData.updateTime;
        }
      } else {
        currentTimeLabel = priceData.lastTime || '';
      }
      
      priceHistory.push(currentProductPrice);
      timeLabels.push(currentTimeLabel);
    }
  }
  
  // Nếu không có dữ liệu từ lịch sử, thử lấy từ giá hiện tại
  if (priceHistory.length === 0) {
    const currentProductPrice = extractProductPrice(priceData);
    if (currentProductPrice !== null) {
      let currentTimeLabel = '';
      if (priceData.lastDate && priceData.lastTime) {
        const datePart = priceData.lastDate.split('/').slice(0, 2).join('/');
        currentTimeLabel = `${datePart} ${priceData.lastTime}`;
      } else if (priceData.updateTime) {
        const parts = priceData.updateTime.split(' ');
        if (parts.length >= 2) {
          const datePart = parts[0].split('/').slice(0, 2).join('/');
          currentTimeLabel = `${datePart} ${parts[1]}`;
        } else {
          currentTimeLabel = priceData.updateTime;
        }
      } else {
        currentTimeLabel = priceData.lastTime || '';
      }
      
      priceHistory.push(currentProductPrice);
      timeLabels.push(currentTimeLabel);
    }
  }
  
  // Tính toán cho chart - full width trên nền xanh dương, cao hơn để sát mép
  const chartWidth = 680; // Full width của table (720px - padding 20px mỗi bên)
  const chartHeight = 160; // Tăng chiều cao để sát mép trên và dưới
  const chartPadding = 20; // Tăng padding để khung giá không bị lọt ra
  const chartInnerWidth = chartWidth - chartPadding * 2;
  const chartInnerHeight = chartHeight - chartPadding * 2 - 15; // Trừ thêm 15px cho phần thời gian
  
  let chartHTML = '';
  // Hiển thị chart nếu có ít nhất 2 giá
  if (priceHistory.length >= 2) {
    try {
      // Tính phần trăm thay đổi so với giá đầu tiên
      const firstPrice = priceHistory[0];
      if (!firstPrice || firstPrice === 0) {
        throw new Error('Invalid first price');
      }
      
      const priceChanges = priceHistory.map(p => {
        if (!p || p === 0) return 0;
        return ((p - firstPrice) / firstPrice) * 100;
      });
      
      // Tìm min/max phần trăm thay đổi
      const maxChange = Math.max(...priceChanges);
      const minChange = Math.min(...priceChanges);
      const changeRange = maxChange - minChange;
      
      // Nếu range quá nhỏ (< 0.1%), mở rộng range để hiển thị rõ hơn
      // Tăng hệ số mở rộng để làm nổi bật biến động nhỏ
      const expansionFactor = changeRange < 0.05 ? 3 : changeRange < 0.1 ? 2.5 : 1.5;
      const displayRange = changeRange < 0.1 ? Math.max(changeRange * expansionFactor, 0.3) : Math.max(changeRange * expansionFactor, 0.2);
      const centerChange = (maxChange + minChange) / 2;
      const displayMin = centerChange - displayRange / 2;
      const displayMax = centerChange + displayRange / 2;
      
      // Kiểm tra tính hợp lệ của displayMin và displayMax
      if (isNaN(displayMin) || isNaN(displayMax) || !isFinite(displayMin) || !isFinite(displayMax)) {
        throw new Error('Invalid display range');
      }
    
      // Tạo SVG path cho line chart - scale theo phần trăm thay đổi
      // Điều chỉnh để khung giá đầu và cuối không bị lọt ra ngoài
      const badgeMargin = 60; // Khoảng cách tối thiểu từ lề để khung giá không bị lọt ra
      const effectiveInnerWidth = chartInnerWidth - badgeMargin * 2; // Chiều rộng hiệu dụng
      
      const points = priceHistory.map((price, index) => {
        // Tính x với margin để điểm đầu và cuối không sát lề
        const x = chartPadding + badgeMargin + (index / (priceHistory.length - 1)) * effectiveInnerWidth;
        const changePercent = priceChanges[index];
        // Scale từ displayMin đến displayMax
        const range = displayMax - displayMin;
        const normalizedChange = range !== 0 ? (changePercent - displayMin) / range : 0.5;
        const y = chartPadding + chartInnerHeight - (normalizedChange * chartInnerHeight);
        return { x, y, price, changePercent };
      });
    
      let svgPath = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        svgPath += ` L ${points[i].x} ${points[i].y}`;
      }
      
      // Format giá đầy đủ với dấu phẩy (ví dụ: 2,329,000)
      const formatPriceSimple = (p: number) => {
        if (!p || p === 0) return '0';
        return formatNumber(p);
      };
      
      // Xác định xu hướng tổng thể (tăng/giảm so với giá đầu)
      const lastPrice = priceHistory[priceHistory.length - 1];
      const priceDiff = lastPrice - firstPrice;
      const priceDiffPercent = (priceDiff / firstPrice) * 100;
      
      // Nếu biến động < 0.01% thì coi như không đổi
      const isStable = Math.abs(priceDiffPercent) < 0.01;
      const isIncreasing = priceDiff > 0 && !isStable;
      
      // Màu sắc: xanh nếu tăng, đỏ nếu giảm, xám nếu không đổi
      const overallLineColor = isStable ? '#6c757d' : (isIncreasing ? '#2d8659' : '#dc3545');
      
      // Text chú thích xu hướng
      let trendText = '';
      let trendColor = '#ffffff';
      if (isStable) {
        trendText = 'Giá ổn định';
        trendColor = '#d4af37'; // Vàng
      } else if (isIncreasing) {
        trendText = 'Giá tăng';
        trendColor = '#90ee90'; // Xanh lá sáng
      } else {
        trendText = 'Giá giảm';
        trendColor = '#ff6b6b'; // Đỏ sáng
      }
      
      // Tạo path cho area fill (gradient)
      const areaPath = `${svgPath} L ${points[points.length - 1].x} ${chartHeight - chartPadding} L ${points[0].x} ${chartHeight - chartPadding} Z`;
    
      chartHTML = `
        <div style="display: flex; flex-direction: column; align-items: stretch; width: 100%;">
          <div class="chart-container">
          <svg class="chart-svg" viewBox="0 0 ${chartWidth} ${chartHeight}" xmlns="http://www.w3.org/2000/svg" style="overflow: visible; width: 100%;">
            <defs>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:${overallLineColor};stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:${overallLineColor};stop-opacity:0.05" />
              </linearGradient>
            </defs>
            
            <!-- Background grid - trong suốt để thấy nền xanh dương -->
            <rect x="${chartPadding}" y="${chartPadding}" width="${chartInnerWidth}" height="${chartInnerHeight}" fill="rgba(255,255,255,0.1)"/>
            
            <!-- Grid lines (horizontal) - màu sáng hơn để thấy trên nền xanh dương -->
            ${Array.from({ length: 4 }, (_, i) => {
              const y = chartPadding + (i * chartInnerHeight / 3);
              return `<line x1="${chartPadding}" y1="${y}" x2="${chartWidth - chartPadding}" y2="${y}" stroke="rgba(255,255,255,0.2)" stroke-width="0.5" stroke-dasharray="2,2"/>`;
            }).join('')}
            
            <!-- Area fill - trong suốt hơn -->
            <path d="${areaPath}" fill="url(#areaGradient)"/>
            
            <!-- Price line (thicker, smoother) - màu theo xu hướng tổng thể, sáng hơn -->
            <path d="${svgPath}" fill="none" stroke="${overallLineColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            
            <!-- Y-axis labels (phần trăm thay đổi) - ẩn đi để tiết kiệm không gian -->
            
            <!-- Baseline (đường giá đầu tiên) để dễ so sánh - màu sáng hơn -->
            <line x1="${chartPadding}" y1="${points[0].y}" x2="${chartWidth - chartPadding}" y2="${points[0].y}" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="5,5"/>
            
            <!-- Data points (larger, with shadow) - màu theo từng điểm -->
            ${points.map((point, index) => {
              const isLastPoint = index === points.length - 1; // Điểm cuối cùng (giá hiện tại)
              
              // Màu cho từng điểm: xanh nếu tăng, đỏ nếu giảm, xám nếu không đổi
              // Điểm cuối cùng dùng màu sáng hơn (vàng/trắng) để nổi bật
              let pointColor = overallLineColor;
              let textColor = '#ffffff'; // Màu text trắng để nổi bật trên nền xanh dương
              let bgColor = 'rgba(30, 60, 114, 0.9)'; // Nền xanh dương đậm với opacity
              
              if (index > 0) {
                const prevPrice = priceHistory[index - 1];
                const diff = point.price - prevPrice;
                const diffPercent = (diff / prevPrice) * 100;
                // Nếu biến động < 0.01% thì coi như không đổi
                if (Math.abs(diffPercent) < 0.01) {
                  pointColor = '#d4af37'; // Vàng cho không đổi
                } else {
                  pointColor = diff > 0 ? '#90ee90' : '#ff6b6b'; // Xanh lá sáng / Đỏ sáng
                }
              } else {
                pointColor = '#d4af37'; // Vàng cho điểm đầu
              }
              
              // Điểm cuối cùng (giá hiện tại) - highlight đặc biệt
              if (isLastPoint) {
                pointColor = '#ffd700'; // Vàng đậm
                textColor = '#1e3c72'; // Xanh dương đậm cho text
                bgColor = 'rgba(255, 215, 0, 0.95)'; // Nền vàng đậm
              }
              
              const priceText = formatPriceSimple(point.price);
              
              // Tính toán width của background box dựa trên độ dài text
              // Ước tính: mỗi ký tự ~7-8px với font-size 13-15
              const estimatedTextWidth = priceText.length * (isLastPoint ? 8 : 7);
              const padding = 12; // Padding trái và phải
              const bgWidth = Math.max(estimatedTextWidth + padding * 2, isLastPoint ? 120 : 100);
              const bgHeight = isLastPoint ? 20 : 16;
              
              // Kích thước và style khác nhau cho điểm cuối cùng
              const circleRadius = isLastPoint ? 8 : 6.5;
              const circleStrokeWidth = isLastPoint ? 3.5 : 2.5;
              const textFontSize = isLastPoint ? 15 : 13;
              
              return `
              <!-- Background cho text để dễ đọc - nổi bật hơn cho điểm cuối -->
              <rect x="${point.x - bgWidth/2}" y="${point.y - bgHeight - 2}" width="${bgWidth}" height="${bgHeight}" fill="${bgColor}" stroke="${pointColor}" stroke-width="${isLastPoint ? 2 : 1}" rx="4" opacity="${isLastPoint ? 1 : 0.96}"/>
              
              <!-- Data point circle - lớn hơn cho điểm cuối -->
              <circle cx="${point.x}" cy="${point.y}" r="${circleRadius + 1}" fill="rgba(255,255,255,0.3)" stroke="none"/>
              <circle cx="${point.x}" cy="${point.y}" r="${circleRadius}" fill="#ffffff" stroke="${pointColor}" stroke-width="${circleStrokeWidth}"/>
              <circle cx="${point.x}" cy="${point.y}" r="${circleRadius - 2}" fill="${pointColor}"/>
              
              <!-- Giá trị giá - lớn và rõ, căn giữa trong background box -->
              <text x="${point.x}" y="${point.y - bgHeight/2 + 1}" font-size="${textFontSize}" font-weight="900" fill="${textColor}" text-anchor="middle">${priceText}</text>
              
              <!-- Thời gian - màu trắng để nổi bật trên nền xanh dương -->
              <text x="${point.x}" y="${chartHeight - 5}" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle" opacity="0.95">${timeLabels[index] || ''}</text>
            `;
            }).join('')}
          </svg>
          </div>
          <!-- Chú thích xu hướng - căn giữa dưới chart -->
          <div style="text-align: center; margin-top: 4px; width: 100%;">
            <span style="font-size: 9px; font-weight: 600; color: ${trendColor}; opacity: 0.9;">${trendText}</span>
          </div>
        </div>
    `;
    } catch (error) {
      console.error('Error generating chart:', error);
      // Nếu có lỗi, không hiển thị chart
      chartHTML = '';
    }
  }

  // Đọc logo Vinh Hoa và convert sang base64
  let logoBase64 = '';
  try {
    const logoPath = join(process.cwd(), 'public', 'vinh_hoa_logo3.png');
    const logoBuffer = await readFile(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error reading logo:', error);
    // Fallback: sử dụng logo box CSS nếu không đọc được file
    logoBase64 = '';
  }

  // Đọc logo Phú Quý và convert sang base64
  let phuQuyLogoBase64 = '';
  try {
    const phuQuyLogoPath = join(process.cwd(), 'public', 'phu_quy_logo.png');
    const phuQuyLogoBuffer = await readFile(phuQuyLogoPath);
    phuQuyLogoBase64 = `data:image/png;base64,${phuQuyLogoBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error reading Phu Quy logo:', error);
    phuQuyLogoBase64 = '';
  }

  let tableRows = '';
  
  if (allProducts && allProducts.length > 0) {
    const productsByCategory = allProducts.reduce((acc, product) => {
      const cat = product.category || 'KHÁC';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(product);
      return acc;
    }, {} as Record<string, typeof allProducts>);

    Object.entries(productsByCategory).forEach(([categoryName, products]) => {
      // Bỏ qua category "KHÁC" - không hiển thị
      if (!categoryName.includes('PHÚ QUÝ')) {
        return;
      }
      
      // Category header row - chỉ hiển thị PHÚ QUÝ
      const categoryClass = 'category-header-phuquy';
      tableRows += `
        <tr class="category-header ${categoryClass}">
          <td colspan="4" class="category-cell">${categoryName}</td>
        </tr>
      `;

      // Product rows
      products.forEach((product) => {
        const buyPriceFormatted = formatNumber(product.buyPrice);
        const sellPriceFormatted = product.sellPrice > 0 ? formatNumber(product.sellPrice) : '-';
        const productUnit = product.unit || unitDisplay;
        
        // Transform tên sản phẩm nếu cần
        let displayProductName = product.productName;
        if (displayProductName.includes('BẠC THỎI PHÚ QUÝ 999 10 LƯỢNG, 5 LƯỢNG')) {
          displayProductName = 'BẠC THỎI PHÚ QUÝ 999 5 LƯỢNG';
        }

        tableRows += `
          <tr>
            <td>${displayProductName}</td>
            <td class="unit-cell">${productUnit}</td>
            <td class="price-buy">${buyPriceFormatted}</td>
            <td class="price-sell">${sellPriceFormatted}</td>
          </tr>
        `;
      });
      
      // Thêm chart vào sau các sản phẩm PHÚ QUÝ
      if (chartHTML) {
        tableRows += `
          <tr>
            <td colspan="4" style="padding: 0; background: #1e3c72;">
              <div class="chart-section" style="padding: 4px 20px; overflow: hidden;">
                ${chartHTML}
              </div>
            </td>
          </tr>
        `;
      }
    });
  }

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>Bảng giá bạc hôm nay</title>
      <style>
        /* ================= BASE ================= */
        body{
          margin:0;
          font-family:"Segoe UI",Roboto,Arial,sans-serif;
          background:#f5f7fa;
          color:#1a1a1a;
        }
        .wrapper{
          width:720px;
          margin:0 auto;
          background:#ffffff;
          box-shadow:0 8px 24px rgba(0,0,0,.10);
        }

        /* ================= HEADER – XANH DƯƠNG ================= */
        .header{
          display:grid;
          grid-template-columns:170px 1fr 170px;
          align-items:center;
          padding:14px 18px 15px;
          background:#1e3c72;
          border-bottom:4px solid #d4af37;
        }
        .header-left{
          display:flex;
          flex-direction:column;
          align-items:center;
        }
        .header-left img{
          height:46px;
          display:block;
          margin-bottom:4px;
        }
        .header-left .brand{
          font-size:13px;
          font-weight:800;
          letter-spacing:.6px;
          color:#d4af37;
          text-align:center;
        }
        .header-center{
          text-align:center;
          display:flex;
          flex-direction:column;
          align-items:center;
        }
        .header-center .title{
          font-size:24px;
          font-weight:900;
          letter-spacing:1.2px;
          text-transform:uppercase;
          color:#ffffff;
        }
        .header-center .time-info{
          margin-top:2px;
          display:flex;
          flex-direction:column;
          align-items:center;
        }
        .header-center .time{
          font-size:30px;
          font-weight:700;
          color:#d4af37;
          line-height:1;
        }
        .header-center .date-label{
          font-size:15px;
          color:#b0c4de;
          margin-top:1px;
        }
        .header-center .date{
          font-size:15px;
          color:#b0c4de;
        }
        .header-right{
          display:flex;
          flex-direction:column;
          align-items:center;
        }
        .header-right img{
          height:46px;
          display:block;
          margin-bottom:4px;
        }
        .header-right .brand{
          font-size:13px;
          font-weight:800;
          letter-spacing:.6px;
          color:#d4af37;
          text-align:center;
        }
        .chart-section{
          width:100%;
          display:flex;
          justify-content:stretch;
          padding:4px 20px;
          background:#1e3c72;
          overflow:hidden;
        }
        .chart-container{
          width:100%;
          height:160px;
          background:transparent;
          border-radius:4px;
          padding:2px;
          box-shadow:none;
          border:none;
          overflow:hidden;
        }
        .chart-svg{
          width:100%;
          height:100%;
          overflow:visible;
        }

        /* ================= TABLE ================= */
        table{
          width:100%;
          border-collapse:collapse;
        }

        thead th{
          background:#2d8659;
          color:#ffffff;
          padding:11px 10px;
          font-size:14px;
          letter-spacing:.5px;
        }
        thead th:first-child{
          text-align:left;
          padding-left:16px;
        }
        thead th:nth-child(2){
          text-align:center;
        }
        thead th:nth-child(3),
        thead th:nth-child(4){
          text-align:center;
        }
        tbody tr{
          border-bottom:1px solid rgba(0,0,0,.08);
        }
        tbody tr:nth-child(even){
          background:#f0f7fa;
        }

        tbody td{
          padding:13px 10px;
          font-size:16px;
          line-height:1.35;
        }
        tbody td:first-child{
          padding-left:16px;
          font-weight:600;
        }
        .category-header{
          background:#e8f4f0;
        }
        .category-header-phuquy{
          background:#d4e4f4;
        }
        .category-header-khac{
          background:#e8f4f0;
        }
        .category-cell{
          font-weight:bold;
          font-size:15px;
          text-align:center;
          padding:10px 15px;
          color:#1e3c72;
        }
        .unit-cell{
          text-align:center;
          color:#666;
          font-size:14px;
        }
        .price-buy{
          color:#dc3545;
          font-weight:900;
          text-align:center;
        }
        .price-sell{
          color:#2d8659;
          font-weight:900;
          text-align:center;
        }

        /* ================= FOOTER ================= */
        .footer{
          display:flex;
          justify-content:center;
          align-items:center;
          padding:8px 16px 10px;
          font-size:10px;
          line-height:1.4;
          color:#666;
          border-top:2px solid #d4af37;
          background:#f8f9fa;
        }
      </style>
    </head>
    <body>

      <div class="wrapper">

        <!-- HEADER -->
        <div class="header">
          <div class="header-left">
            ${logoBase64 ? `<img src="${logoBase64}" alt="Logo">` : ''}
            <div class="brand">VINH HOA</div>
          </div>
          <div class="header-center">
            <div class="title">GIÁ BẠC HÔM NAY</div>
            <div class="time-info">
              <div class="time">${updateTimeOnly}</div>
              <div class="date-label">Cập nhật lần cuối</div>
              <div class="date">${updateDate}</div>
            </div>
          </div>
          <div class="header-right">
            ${phuQuyLogoBase64 ? `<img src="${phuQuyLogoBase64}" alt="Logo Phú Quý">` : ''}
            <div class="brand">PHÚ QUÝ</div>
          </div>
        </div>

        <!-- TABLE -->
        <table>
          <thead>
            <tr>
              <th>SẢN PHẨM</th>
              <th>ĐƠN VỊ</th>
              <th>GIÁ MUA VÀO</th>
              <th>GIÁ BÁN RA</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <!-- FOOTER -->
        <div class="footer">
          <span style="font-weight: 600; display: inline-block; text-align: center; line-height: 1.5;">
            <strong>VÀNG BẠC VINH HOA</strong> - Đại lý uỷ quyền chính hãng Tập đoàn vàng bạc Phú Quý<br>
            Mã số thuế: ..... | Địa chỉ: 338 Thích Quảng Đức, P. Thủ Dầu Một, TP. Hồ Chí Minh | Hotline: xxxxx
          </span>
        </div>

      </div>

    </body>
    </html>
  `;
}

/**
 * Generate ảnh từ HTML template
 */
export async function generatePriceImage(priceData: PriceData, priceChange: PriceChange, previousPrice?: PriceData | null): Promise<Buffer> {
  const html = await createPriceImageHTML(priceData, priceChange, previousPrice);
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport cho portrait (720px width)
    await page.setViewport({
      width: 720,
      height: 1000,
      deviceScaleFactor: 2,
    });
    
    // Set content
    await page.setContent(html, {
      waitUntil: 'networkidle0',
    });
    
    // Đợi một chút để đảm bảo render xong
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Lấy chiều cao thực tế của content
    const bodyHeight = await page.evaluate(() => {
      return document.body.scrollHeight;
    });
    
    // Take screenshot với chiều cao vừa đủ
    const screenshot = await page.screenshot({
      type: 'png',
      clip: {
        x: 0,
        y: 0,
        width: 720,
        height: Math.min(bodyHeight, 2000), // Giới hạn tối đa 2000px
      },
    });
    
    return screenshot as Buffer;
  } finally {
    await browser.close();
  }
}
