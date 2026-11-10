import { Badge, Box, Button, Card, Flex, Grid, Spinner, Stack, Text } from "@sanity/ui";
import * as React from "react";
import { useClient } from "sanity";
import { useRouter } from "sanity/router";

type Order = { _id: string; orderNo?: string; customerName?: string; total?: number; status?: string; placedAt?: string };
type Enquiry = { _id: string; kind?: string; subject?: string; email?: string; replied?: boolean; receivedAt?: string };
type StockItem = { sku?: string; label?: string; stock?: number | null };
type Book = { title?: string; variants?: Array<{ name?: string; stock?: number | null }> };
type Data = { orders: Order[]; enquiries: Enquiry[]; printStock: StockItem[]; books: Book[] };

const LOW_STOCK = 3;

const QUERY = `{
  "orders": *[_type == "order"] | order(placedAt desc){ _id, orderNo, customerName, total, status, placedAt },
  "enquiries": *[_type == "contactFormSubmission"] | order(receivedAt desc){ _id, kind, subject, email, replied, receivedAt },
  "printStock": *[_id == "storeStock"][0].items[]{ sku, label, stock },
  "books": *[_type == "book"]{ title, variants[]{ name, stock } }
}`;

function Stat({ label, value, tone }: { label: string; value: string; tone?: "critical" | "caution" | "positive" }) {
  return (
    <Card padding={3} radius={2} tone={tone ?? "transparent"} border>
      <Stack space={3}>
        <Text size={1} muted>
          {label}
        </Text>
        <Text size={4} weight="semibold">
          {value}
        </Text>
      </Stack>
    </Card>
  );
}

function shortDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
}

export function StoreOverview() {
  const client = useClient({ apiVersion: "2024-01-01" });
  const router = useRouter();
  const [data, setData] = React.useState<Data | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    client
      .fetch<Data>(QUERY)
      .then((res) => active && setData(res))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [client]);

  const open = (type: string, id: string) => router.navigateIntent("edit", { id, type });

  if (failed) {
    return (
      <Box padding={4}>
        <Text muted>Couldn't load the overview. Open the tabs on the left instead.</Text>
      </Box>
    );
  }
  if (!data) {
    return (
      <Flex align="center" justify="center" padding={5}>
        <Spinner />
      </Flex>
    );
  }

  const orders = data.orders ?? [];
  const enquiries = data.enquiries ?? [];
  const revenue = orders.filter((o) => o.status === "paid" || o.status === "shipped").reduce((s, o) => s + (o.total ?? 0), 0);
  const toFulfil = orders.filter((o) => o.status === "paid");
  const unreplied = enquiries.filter((e) => !e.replied);
  const lowStock = [
    ...(data.printStock ?? [])
      .filter((i) => typeof i.stock === "number" && (i.stock as number) <= LOW_STOCK)
      .map((i) => ({ label: i.label ?? i.sku ?? "Print", stock: i.stock as number })),
    ...(data.books ?? []).flatMap((b) =>
      (b.variants ?? [])
        .filter((v) => typeof v.stock === "number" && (v.stock as number) <= LOW_STOCK)
        .map((v) => ({ label: `${b.title ?? "Book"} — ${v.name ?? ""}`, stock: v.stock as number }))
    ),
  ];

  return (
    <Box padding={4}>
      <Stack space={5}>
        <Grid columns={[1, 3]} gap={3}>
          <Stat label="Revenue (paid)" value={`€${Math.round(revenue).toLocaleString("en-GB")}`} />
          <Stat label="Orders to fulfil" value={`${toFulfil.length}`} tone={toFulfil.length ? "caution" : undefined} />
          <Stat label="Unreplied enquiries" value={`${unreplied.length}`} tone={unreplied.length ? "caution" : undefined} />
        </Grid>

        {lowStock.length > 0 && (
          <Card padding={3} radius={2} tone="critical" border>
            <Stack space={3}>
              <Text size={1} weight="semibold">
                Low stock
              </Text>
              {lowStock.map((s) => (
                <Text key={s.label} size={1}>
                  {s.label} — {s.stock} left
                </Text>
              ))}
            </Stack>
          </Card>
        )}

        <Stack space={3}>
          <Text size={1} weight="semibold" muted>
            Recent orders
          </Text>
          {orders.length === 0 && (
            <Text size={1} muted>
              No orders yet.
            </Text>
          )}
          {orders.slice(0, 6).map((o) => (
            <Button
              key={o._id}
              mode="bleed"
              padding={2}
              onClick={() => open("order", o._id)}
              style={{ width: "100%", textAlign: "left" }}
            >
              <Flex align="center" justify="space-between" gap={3}>
                <Text size={1}>
                  {o.orderNo ?? "Order"} {o.customerName ? `· ${o.customerName}` : ""}
                </Text>
                <Flex align="center" gap={2}>
                  <Badge tone={o.status === "shipped" ? "positive" : o.status === "paid" ? "caution" : "default"} fontSize={0}>
                    {o.status ?? "paid"}
                  </Badge>
                  <Text size={1} muted>
                    €{Math.round(o.total ?? 0)} · {shortDate(o.placedAt)}
                  </Text>
                </Flex>
              </Flex>
            </Button>
          ))}
        </Stack>

        <Stack space={3}>
          <Text size={1} weight="semibold" muted>
            Recent enquiries
          </Text>
          {enquiries.length === 0 && (
            <Text size={1} muted>
              No enquiries yet.
            </Text>
          )}
          {enquiries.slice(0, 6).map((e) => (
            <Button
              key={e._id}
              mode="bleed"
              padding={2}
              onClick={() => open("contactFormSubmission", e._id)}
              style={{ width: "100%", textAlign: "left" }}
            >
              <Flex align="center" justify="space-between" gap={3}>
                <Text size={1}>{e.subject || e.email || "Enquiry"}</Text>
                <Flex align="center" gap={2}>
                  <Badge tone={e.replied ? "positive" : "caution"} fontSize={0}>
                    {e.replied ? "replied" : "new"}
                  </Badge>
                  <Text size={1} muted>
                    {e.kind ?? ""} · {shortDate(e.receivedAt)}
                  </Text>
                </Flex>
              </Flex>
            </Button>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
