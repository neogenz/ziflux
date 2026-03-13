import { CodeBlock } from "./code-block"

const STORE_TEST_CODE = `describe('OrderListStore', () => {
  let store: OrderListStore

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZiflux(),
        provideHttpClient(),
        provideHttpClientTesting(),
        OrderApi,
        OrderListStore,
      ],
    })
    store = TestBed.inject(OrderListStore)
  })

  it('loads orders', async () => {
    const httpTesting = TestBed.inject(HttpTestingController)

    // Flush the HTTP request
    httpTesting.expectOne('/orders').flush([{ id: '1', status: 'pending' }])
    await flushMicrotasks()
    TestBed.tick()

    expect(store.orders.value()).toHaveLength(1)
  })
})`

const STANDALONE_CACHE_TEST_CODE = `let cache: DataCache

beforeEach(() => {
  TestBed.configureTestingModule({})
  cache = TestBed.runInInjectionContext(() => new DataCache())
})

it('stores and retrieves data', () => {
  cache.set(['key'], 'value')
  expect(cache.get<string>(['key'])?.data).toBe('value')
})`

export function Testing() {
  return (
    <section id="testing" className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
      <h2 className="group text-2xl font-bold tracking-tight sm:text-3xl">
        <a href="#testing" className="hover:no-underline">Testing <span className="text-muted-foreground/0 transition-colors group-hover:text-muted-foreground">#</span></a>
      </h2>
      <p className="mt-2 text-muted-foreground">
        <code>DataCache</code> and <code>cachedResource</code> require an Angular injection context. Use <code>TestBed</code>.
      </p>

      {/* Testing a store */}
      <div className="mt-8">
        <h3 className="mb-2 text-lg font-semibold">Testing a Store</h3>
        <CodeBlock code={STORE_TEST_CODE} filename="order-list.store.spec.ts" />
      </div>

      {/* Testing with standalone DataCache */}
      <div className="mt-8">
        <h3 className="mb-2 text-lg font-semibold">Testing a Standalone DataCache</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Use <code>runInInjectionContext</code> when you need a bare cache without the full store setup.
        </p>
        <CodeBlock code={STANDALONE_CACHE_TEST_CODE} filename="data-cache.spec.ts" />
      </div>
    </section>
  )
}
