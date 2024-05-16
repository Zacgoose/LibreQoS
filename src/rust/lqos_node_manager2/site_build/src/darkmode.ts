export function InitDayNightMode() {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        const darkModeSwitch = document.getElementById('darkModeSwitch') as HTMLInputElement;
        darkModeSwitch.checked = true;
        document.body.classList.add('dark-mode');
        document.documentElement.setAttribute('data-bs-theme', "dark");
    } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.setAttribute('data-bs-theme', "light");
    }

    document.addEventListener('DOMContentLoaded', (event) => {
        const darkModeSwitch = document.getElementById('darkModeSwitch') as HTMLInputElement;
        const currentTheme = localStorage.getItem('theme');

        if (currentTheme === 'dark') {
            document.body.classList.add('dark-mode');
            darkModeSwitch.checked = true;
        }

        darkModeSwitch.addEventListener('change', () => {
            if (darkModeSwitch.checked) {
                document.body.classList.add('dark-mode');
                document.documentElement.setAttribute('data-bs-theme', "dark");
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                document.documentElement.setAttribute('data-bs-theme', "light");
                localStorage.setItem('theme', 'light');
            }

            if (window.router) {
                window.router.onThemeSwitch();
            }
        });
    });
}

export function currentThemeForChart(): string {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme == "dark") {
        return "dark";
    } else {
        return "light";
    }
}