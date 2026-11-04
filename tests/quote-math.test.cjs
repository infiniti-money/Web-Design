const test=require("node:test"),assert=require("node:assert/strict"),{calculate}=require("../assets/quote-math.js");
test("Quote totals use integer VND rounding for fractional quantities, discounts and tax",()=>{
  const value=calculate({items:[{description:"Hạng mục A",unit:"m²",quantity:"2.50",unit_price:"12345"},{description:"Hạng mục B",unit:"gói",quantity:"1",unit_price:"10000"}],discount:"1000",tax_rate:"8"});
  assert.equal(value.items[0].amount,30863);assert.equal(value.subtotal,40863);assert.equal(value.tax_amount,3189);assert.equal(value.total,43052);
});
test("Invalid money, negative quantity, excessive precision and inconsistent discounts are rejected",()=>{
  const line={description:"Hạng mục",quantity:1,unit_price:10000};
  for(const item of [{...line,quantity:-1},{...line,quantity:"1.234"},{...line,unit_price:"1.5"},{...line,description:""},{...line,unit_price:"Infinity"}])assert.throws(()=>calculate({items:[item]}));
  assert.throws(()=>calculate({items:[line],discount:10001}));assert.throws(()=>calculate({items:[line],tax_rate:101}));assert.throws(()=>calculate({items:[]}));
});
