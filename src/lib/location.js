// "Use my location": the browser gives the coordinates of the user (after the user agrees),
// and the BigDataCloud API (free, made for use in the browser) tells which country they are in.

// The location of the user as { latitude, longitude }.
// It rejects with the error of the browser, for example when the user says "Block".
export function getMyPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      reject,
      { timeout: 10000, maximumAge: 10 * 60 * 1000 } // wait at most 10 seconds; a position of 10 minutes ago is fine
    );
  });
}

// The country (code like "KR") at some coordinates
export async function getCountryAt(latitude, longitude) {
  const url =
    "https://api.bigdatacloud.net/data/reverse-geocode-client" +
    `?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not find the country");

  const data = await res.json();
  return data.countryCode || ""; // "" when the user is in the sea or somewhere without a country
}
