using System;
using System.Net;
using System.Net.Sockets;
using System.Threading.Tasks;

public class DnsTest
{
    public static async Task Main()
    {
        foreach (var family in new[]
        {
            AddressFamily.InterNetwork,
            AddressFamily.InterNetworkV6
        })
        {
            try
            {
                var addresses = await Dns.GetHostAddressesAsync(
                    "api.cloudinary.com",
                    family
                );

                Console.WriteLine($"{family}:");

                foreach (var address in addresses)
                    Console.WriteLine(address);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"{family}: {ex.Message}");
            }
        }
    }
}