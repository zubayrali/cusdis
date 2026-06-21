import { Provider } from 'next-auth/client'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ColorScheme, ColorSchemeProvider, MantineProvider, MantineThemeOverride } from '@mantine/core'
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import NextApp, { AppContext, AppProps } from 'next/app'
import { useState } from 'react'

import '../style.css'

const COLOR_SCHEME_KEY = 'cusdis-color-scheme'

function readColorScheme(cookie?: string): ColorScheme {
  const m = (cookie || '').match(new RegExp(`(?:^|;\\s*)${COLOR_SCHEME_KEY}=(dark|light)`))
  return (m?.[1] as ColorScheme) || 'light'
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false
    }
  }
})

const fontStack =
  'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

// Modern, neutral theme — near-black primary, soft radius, refined surfaces.
const theme: MantineThemeOverride = {
  primaryColor: 'dark',
  primaryShade: { light: 9, dark: 5 },
  defaultRadius: 'md',
  fontFamily: fontStack,
  fontFamilyMonospace:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  headings: { fontFamily: fontStack, fontWeight: 650 },
  colors: {
    // Slightly warmer neutral grays than Mantine's default.
    gray: [
      '#fafafa', '#f4f4f5', '#e9e9eb', '#d6d6da', '#b8b8bf',
      '#8e8e96', '#6b6b73', '#4b4b52', '#2e2e33', '#1c1c1f',
    ],
  },
  components: {
    Button: {
      defaultProps: { radius: 'md' },
      styles: { root: { fontWeight: 600 } },
    },
    Paper: { defaultProps: { radius: 'md' } },
    Card: { defaultProps: { radius: 'md', withBorder: true } },
    Modal: {
      defaultProps: { radius: 'md' },
      styles: { title: { fontWeight: 650 } },
    },
    TextInput: { defaultProps: { radius: 'md' } },
    Textarea: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md' } },
    Badge: { defaultProps: { radius: 'sm' } },
    NavLink: {
      styles: (t) => ({
        root: {
          borderRadius: t.radius.md,
          fontWeight: 500,
        },
      }),
    },
  },
}

export default function App(props: AppProps & { colorScheme: ColorScheme }) {
  const { Component, pageProps } = props
  // Seeded from the cookie at SSR time, so the server already renders the right
  // scheme — no light flash before hydration. State persists across navigations.
  const [colorScheme, setColorScheme] = useState<ColorScheme>(props.colorScheme)
  const toggleColorScheme = (value?: ColorScheme) => {
    const next = value || (colorScheme === 'dark' ? 'light' : 'dark')
    setColorScheme(next)
    document.cookie = `${COLOR_SCHEME_KEY}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  }

  return (

    <Provider session={pageProps.session}>
      {/* @ts-ignore */}
      <QueryClientProvider client={queryClient}>
        <ColorSchemeProvider colorScheme={colorScheme} toggleColorScheme={toggleColorScheme}>
          <MantineProvider theme={{ ...theme, colorScheme }} withGlobalStyles withNormalizeCSS>
            <ModalsProvider>
              <Notifications position='top-center' />
              <Component {...pageProps} />
            </ModalsProvider>
          </MantineProvider>
        </ColorSchemeProvider>
      </QueryClientProvider>
    </Provider>
  )
}

App.getInitialProps = async (appContext: AppContext) => {
  const appProps = await NextApp.getInitialProps(appContext)
  return {
    ...appProps,
    colorScheme: readColorScheme(appContext.ctx.req?.headers.cookie),
  }
}
