import * as cheerio from 'cheerio';

export interface ParsedPrice {
  productName: string;
  buyPrice: number;
  sellPrice: number;
  unit: string;
  category?: string; // BẠC THƯƠNG HIỆU PHÚ QUÝ hoặc BẠC THƯƠNG HIỆU KHÁC
}

export interface AllProductsData {
  products: ParsedPrice[];
  updateTime: string;
  lastDate: string;
  lastTime: string;
  timestamp: number;
}

/**
 * Parse tất cả sản phẩm từ HTML
 */
export function parseAllProducts(html: string): ParsedPrice[] {
  const $ = cheerio.load(html);
  const table = $('table.table.table-striped.table-bordered');
  
  if (table.length === 0) {
    return [];
  }

  const products: ParsedPrice[] = [];
  const rows = table.find('tbody tr');
  let currentCategory = '';

  rows.each((_, row) => {
    const $row = $(row);
    
    // Kiểm tra nếu là row category
    const categoryCell = $row.find('td[colspan="4"] .branch_title, td[colspan="4"] p.branch_title');
    if (categoryCell.length > 0) {
      currentCategory = categoryCell.text().trim();
      return; // Skip category row
    }

    // Kiểm tra nếu là row sản phẩm
    const productCell = $row.find('td.col-product');
    if (productCell.length === 0) {
      return; // Skip non-product rows
    }

    const productName = productCell.text().trim().replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
    
    // Lấy đơn vị
    const unitCell = $row.find('td.col-unit-value');
    const unit = unitCell.text().trim() || 'Vnđ/Lượng';

    // Lấy giá mua (màu đỏ #8B171A)
    const buyCell = $row.find('td.col-buy-cell[style*="#8B171A"]');
    const buyPriceText = buyCell.length > 0 
      ? buyCell.text().trim() 
      : $row.find('td').eq(2).text().trim();

    // Lấy giá bán (màu xanh #25544B)
    const sellCell = $row.find('td.col-buy-cell[style*="#25544B"]');
    let sellPriceText = sellCell.length > 0 
      ? sellCell.text().trim() 
      : $row.find('td').eq(3).text().trim();

    // Xử lý trường hợp giá bán là "-"
    if (sellPriceText === '-' || sellPriceText.trim() === '') {
      sellPriceText = '0';
    }

    const buyPrice = parsePriceNumber(buyPriceText);
    const sellPrice = parsePriceNumber(sellPriceText);

    if (!isNaN(buyPrice) && buyPrice > 0) {
      products.push({
        productName,
        buyPrice,
        sellPrice: sellPrice || 0,
        unit,
        category: currentCategory,
      });
    }
  });

  return products;
}

/**
 * Parse HTML response từ SilverPricePartial API
 * Extract giá mua và giá bán từ table (single product)
 */
export function parsePriceHTML(html: string, productName?: string): ParsedPrice | null {
  const $ = cheerio.load(html);
  
  // Tìm table với class "table table-striped table-bordered"
  const table = $('table.table.table-striped.table-bordered');
  
  if (table.length === 0) {
    return null;
  }

  // Tìm tất cả các row trong tbody
  const rows = table.find('tbody tr');
  
  let targetProductName = productName || 'BẠC MIẾNG PHÚ QUÝ 999 1 LƯỢNG';
  
  // Tìm row chứa sản phẩm cần tìm
  let foundRow: cheerio.Cheerio<cheerio.Element> | null = null;
  
  rows.each((_, row) => {
    const $row = $(row);
    const productCell = $row.find('td.col-product');
    
    if (productCell.length > 0) {
      const text = productCell.text().trim();
      // Decode HTML entities
      const decodedText = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
      
      if (decodedText.includes(targetProductName) || text.includes(targetProductName)) {
        foundRow = $row;
        return false; // Break loop
      }
    }
  });

  if (!foundRow || foundRow.length === 0) {
    // Nếu không tìm thấy sản phẩm cụ thể, lấy sản phẩm đầu tiên có giá
    rows.each((_, row) => {
      const $row = $(row);
      const buyCell = $row.find('td.col-buy-cell[style*="#8B171A"]');
      const sellCell = $row.find('td.col-buy-cell[style*="#25544B"]');
      
      if (buyCell.length > 0 && sellCell.length > 0) {
        foundRow = $row;
        const productCell = $row.find('td.col-product');
        if (productCell.length > 0) {
          targetProductName = productCell.text().trim().replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
        }
        return false; // Break loop
      }
    });
  }

  if (!foundRow || foundRow.length === 0) {
    return null;
  }

  // Extract giá mua (màu đỏ #8B171A)
  const buyCell = foundRow.find('td.col-buy-cell[style*="#8B171A"]');
  // Hoặc tìm theo thứ tự cột (cột thứ 3)
  const buyPriceText = buyCell.length > 0 
    ? buyCell.text().trim() 
    : foundRow.find('td').eq(2).text().trim();

  // Extract giá bán (màu xanh #25544B)
  const sellCell = foundRow.find('td.col-buy-cell[style*="#25544B"]');
  // Hoặc tìm theo thứ tự cột (cột thứ 4)
  const sellPriceText = sellCell.length > 0 
    ? sellCell.text().trim() 
    : foundRow.find('td').eq(3).text().trim();

  // Lấy tên sản phẩm
  const productCell = foundRow.find('td.col-product');
  if (productCell.length > 0) {
    const name = productCell.text().trim();
    targetProductName = name.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
  }

  // Parse giá: Loại bỏ dấu phẩy và convert sang number
  const buyPrice = parsePriceNumber(buyPriceText);
  const sellPrice = parsePriceNumber(sellPriceText);

  if (isNaN(buyPrice) || isNaN(sellPrice)) {
    return null;
  }

  return {
    productName: targetProductName,
    buyPrice,
    sellPrice,
  };
}

/**
 * Parse số từ string có dấu phẩy
 * Ví dụ: "2,329,000" → 2329000
 */
function parsePriceNumber(priceText: string): number {
  // Loại bỏ tất cả ký tự không phải số
  const cleaned = priceText.replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

