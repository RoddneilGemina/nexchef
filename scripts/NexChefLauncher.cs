using System;
using System.Diagnostics;
using System.IO;

namespace NexChefLauncher
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            string projectDir = @"C:\Users\Admin\Documents\Projects\nexchef";

            if (!Directory.Exists(projectDir))
            {
                projectDir = AppDomain.CurrentDomain.BaseDirectory;
            }

            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "wt.exe";
                psi.Arguments = string.Format("-title \"Antigravity\" -d \"{0}\" cmd /k \"where antigravity >nul 2>&1 && antigravity || agy\" ; new-tab -title \"Expo Server\" -d \"{0}\" cmd /k \"npx expo start\"", projectDir);
                psi.UseShellExecute = true;
                Process.Start(psi);
            }
            catch
            {
                // Fallback to cmd separate windows if wt fails
                try
                {
                    ProcessStartInfo psi1 = new ProcessStartInfo();
                    psi1.FileName = "cmd.exe";
                    psi1.Arguments = string.Format("/k \"cd /d \"{0}\" && (where antigravity >nul 2>&1 && antigravity || agy)\"", projectDir);
                    psi1.UseShellExecute = true;
                    Process.Start(psi1);

                    ProcessStartInfo psi2 = new ProcessStartInfo();
                    psi2.FileName = "cmd.exe";
                    psi2.Arguments = string.Format("/k \"cd /d \"{0}\" && npx expo start\"", projectDir);
                    psi2.UseShellExecute = true;
                    Process.Start(psi2);
                }
                catch
                {
                    // Ignore
                }
            }
        }
    }
}
