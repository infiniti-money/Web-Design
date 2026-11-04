(function(root,factory){if(typeof module==="object"&&module.exports)module.exports=factory();else root.AtelierQuoteMath=factory();})(typeof window!=="undefined"?window:globalThis,()=>{
  "use strict";
  const max=90000000000000n;
  function decimal(value,label,decimals=2){const text=String(value??"").trim(),pattern=decimals===0?"^\\d+$":"^\\d+(?:\\.\\d{1,"+decimals+"})?$";if(!new RegExp(pattern).test(text))throw new Error(label+" không hợp lệ.");const n=Number(text);if(!Number.isFinite(n))throw new Error(label+" không hợp lệ.");return n;}
  function money(value,label){const n=decimal(value,label,0);if(!Number.isSafeInteger(n)||n<0||BigInt(n)>max)throw new Error(label+" vượt giới hạn.");return BigInt(n);}
  function calculate({items,discount=0,tax_rate=0}){
    if(!Array.isArray(items)||!items.length||items.length>100)throw new Error("Báo giá cần từ 1 đến 100 hạng mục.");
    let subtotal=0n;
    const lines=items.map((item,index)=>{const description=String(item.description||"").trim(),unit=String(item.unit||"gói").trim();if(!description||description.length>500||unit.length>40)throw new Error("Kiểm tra mô tả hạng mục "+(index+1)+".");const quantity=decimal(item.quantity,"Số lượng");if(quantity<=0||quantity>1000000)throw new Error("Số lượng phải lớn hơn 0 và không quá 1.000.000.");const price=money(item.unit_price,"Đơn giá");if(price>1000000000000n)throw new Error("Đơn giá vượt giới hạn.");const amount=(BigInt(Math.round(quantity*100))*price+50n)/100n;subtotal+=amount;if(subtotal>max)throw new Error("Tổng giá trị vượt giới hạn.");return{description,unit,quantity,unit_price:Number(price),amount:Number(amount)};});
    const reduction=money(discount,"Giảm trừ");if(reduction>subtotal)throw new Error("Giảm trừ không được lớn hơn tạm tính.");const rate=decimal(tax_rate,"Thuế suất");if(rate>100)throw new Error("Thuế suất phải từ 0 đến 100%.");const tax=((subtotal-reduction)*BigInt(Math.round(rate*100))+5000n)/10000n,total=subtotal-reduction+tax;if(total>max)throw new Error("Tổng thanh toán vượt giới hạn.");
    return{schema_version:1,currency:"VND",items:lines,subtotal:Number(subtotal),discount:Number(reduction),tax_rate:rate,tax_amount:Number(tax),total:Number(total)};
  }
  return{calculate};
});
