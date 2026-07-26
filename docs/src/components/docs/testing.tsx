import { CodeBlock } from "@/components/shared/code-block"
import { SectionHeading } from "@/components/docs/section-heading"

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
    await new Promise(r => setTimeout(r, 0)); TestBed.tick()

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
    <section className="py-10 sm:py-12">
      <SectionHeading level={2} id="testing" label="Testing">
        Testing
      </SectionHeading>
      <p className="mt-2 text-muted-foreground">
        <code>DataCache</code> and <code>cachedResource</code> require an Angular injection context. Use <code>TestBed</code>.
      </p>

      {/* Testing a store */}
      <div className="mt-8">
        <SectionHeading level={3} id="testing-store" label="Testing a store" className="mb-2">
          Testing a store
        </SectionHeading>
        <CodeBlock code={STORE_TEST_CODE} filename="order-list.store.spec.ts" />
      </div>

      {/* Testing with standalone DataCache */}
      <div className="mt-8">
        <SectionHeading level={3} id="testing-data-cache" label="Testing a standalone DataCache" className="mb-2">
          Testing a standalone DataCache
        </SectionHeading>
        <p className="mb-3 text-sm text-muted-foreground">
          Use <code>runInInjectionContext</code> when you need a bare cache without the full store setup.
        </p>
        <CodeBlock code={STANDALONE_CACHE_TEST_CODE} filename="data-cache.spec.ts" />
      </div>
    </section>
  )
}
