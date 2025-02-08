export async function runner(input) {
  const { accessToken, calendarId = "primary" } = input;

  if (!accessToken) {
    return {
      error: "Missing accessToken",
      status: 400,
    };
  }

  const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: errorText,
        status: response.status,
      };
    }

    const data = await response.json();
    return {
      data,
      status: 200,
    };
  } catch (error) {
    return {
      error: "Failed to fetch calendar events",
      details: error.message,
      status: 500,
    };
  }
} 