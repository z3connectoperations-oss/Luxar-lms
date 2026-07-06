const test = async () => {
  const res = await fetch("http://localhost:8787/api/checkout/status/MOCK_MT_abcd");
  const text = await res.text();
  console.log(text);
}
test();
