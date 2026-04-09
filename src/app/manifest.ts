import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Steward Church Management',
    short_name: 'Steward',
    description: 'Premium church finance and management SaaS.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FCFBF8',
    theme_color: '#123026',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
