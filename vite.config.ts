import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = dirname(fileURLToPath(import.meta.url))

const externalPackages = ['wc-utils']

const isExternal = (source: string) => (
    externalPackages.some((packageName) => (
        source === packageName || source.startsWith(`${packageName}/`)
    ))
)

export default defineConfig({
    plugins: [
        dts({
            include: ['src/**/*.ts'],
            outDir: 'dist',
            rollupTypes: false,
            insertTypesEntry: true,
            tsconfigPath: './tsconfig.json',
        }),
    ],
    build: {
        lib: {
            entry: resolve(packageRoot, 'src/index.ts'),
            formats: ['es'],
            fileName: 'index',
        },
        rollupOptions: {
            external: isExternal,
        },
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
    },
})
