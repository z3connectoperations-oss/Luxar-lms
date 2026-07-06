const test = async () => {
  const res = await fetch("http://localhost:8787/site/test-series/tnpsc-group-4-mock-test-series");
  const json = await res.json();
  console.log(JSON.stringify(json, null, 2));
}
test();
