
export async function GET() {
  try {
    const response = await fetch(
      "https://dummyjson.com/users?limit=20&select=id,firstName,lastName,email,phone",
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return Response.json(
        { error: "Unable to fetch external user data" },
        { status: 502 }
      );
    }

    const data = await response.json();

    const users = data.users.map((user: any) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
    }));

    return Response.json({ users });
  } catch (error) {
    return Response.json(
      { error: "External data service is unavailable" },
      { status: 500 }
    );
  }
}
