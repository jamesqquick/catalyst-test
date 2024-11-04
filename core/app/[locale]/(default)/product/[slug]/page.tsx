import { removeEdgesAndNodes } from '@bigcommerce/catalyst-client';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

import { getProduct } from './page-data';
import { IconBlock } from '@/vibes/soul/sections/icon-block';
import { ProductDescription } from '@/vibes/soul/sections/product-description';
import { ProductDetail } from '@/vibes/soul/sections/product-detail';
import { pricesTransformer } from '~/data-transformers/prices-transformer';
import { LocaleType } from '~/i18n/routing';
import { RelatedProducts } from './_components/related-products';
import { Reviews } from './_components/reviews';

interface Props {
  params: { slug: string; locale: LocaleType };
  searchParams: Record<string, string | string[] | undefined>;
}

function getOptionValueIds({ searchParams }: { searchParams: Props['searchParams'] }) {
  const { slug, ...options } = searchParams;

  return Object.keys(options)
    .map((option) => ({
      optionEntityId: Number(option),
      valueEntityId: Number(searchParams[option]),
    }))
    .filter(
      (option) => !Number.isNaN(option.optionEntityId) && !Number.isNaN(option.valueEntityId),
    );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const productId = Number(params.slug);
  const optionValueIds = getOptionValueIds({ searchParams });

  const product = await getProduct({
    entityId: productId,
    optionValueIds,
    useDefaultOptionSelections: true,
  });

  if (!product) {
    return {};
  }

  const { pageTitle, metaDescription, metaKeywords } = product.seo;
  const { url, altText: alt } = product.defaultImage || {};

  return {
    title: pageTitle || product.name,
    description: metaDescription || `${product.plainTextDescription.slice(0, 150)}...`,
    keywords: metaKeywords ? metaKeywords.split(',') : null,
    openGraph: url
      ? {
          images: [
            {
              url,
              alt,
            },
          ],
        }
      : null,
  };
}

// TODO: Temporary accordions
const accordions = [
  {
    title: 'What is your return policy?',
    content:
      'We want you to be completely satisfied with your purchase. If you’re not happy with your plant, you can return it within 30 days of delivery. Please ensure the plant is in its original condition and packaging. For detailed return instructions, visit our Return Policy page or contact our customer support team.',
  },
  {
    title: 'How do I care for my new plants?',
    content:
      'Caring for your new plants involves understanding their specific needs. Most indoor plants require indirect sunlight, regular watering, and occasional feeding. Check the plant care tag that comes with your purchase for detailed instructions. If you need more help, our Care Guide section offers detailed advice for each plant type.',
  },
  {
    title: 'Do you offer plant delivery services?',
    content:
      'Yes, we offer nationwide delivery for all our plants. Our plants are carefully packaged to ensure they arrive healthy and safe. Delivery times vary depending on your location but typically range from 3 to 7 business days. For more information, check our Delivery Information page or enter your zip code at checkout for estimated delivery times.',
  },
  {
    title: 'Can I get advice on choosing the right plant?',
    content:
      'Absolutely! Choosing the right plant can depend on several factors such as your living space, light availability, and personal preferences. Our Plant Finder tool can help you select the perfect plant for your environment. Additionally, our customer service team is available to offer personalized recommendations based on your needs.',
  },
];

export default async function Product({ params: { locale, slug }, searchParams }: Props) {
  setRequestLocale(locale);

  const t = await getTranslations('Product');

  const format = await getFormatter();

  const productId = Number(slug);

  const optionValueIds = getOptionValueIds({ searchParams });

  const product = await getProduct({
    entityId: productId,
    optionValueIds,
    useDefaultOptionSelections: true,
  });

  if (!product) {
    return notFound();
  }

  // TODO: add breadcrumb
  // const category = removeEdgesAndNodes(product.categories).at(0);

  const formattedProduct = {
    id: product.entityId.toString(),
    title: product.name,
    href: product.path,
    image: { src: product.defaultImage?.url ?? '', alt: product.defaultImage?.altText ?? '' },
    images: removeEdgesAndNodes(product.images).map((image) => ({
      src: image.url,
      alt: image.altText,
    })),
    price: pricesTransformer(product.prices, format),
    subtitle: product.brand?.name,
    description: product.description,
    rating: product.reviewSummary.averageRating,
  };

  return (
    <>
      <ProductDetail product={formattedProduct} />

      <ProductDescription
        accordions={accordions}
        image={{
          src: product.defaultImage?.url ?? '',
          alt: product.defaultImage?.altText ?? '',
        }}
      />

      {/* TODO: Temporary */}
      <IconBlock
        list={[
          {
            icon: 'Truck',
            title: 'Free Shipping',
            description: 'On orders over $250',
          },
          {
            icon: 'RotateCcw',
            title: 'Free Returns',
            description: 'On full priced items only',
          },
          {
            icon: 'Star',
            title: '2 Year Warranty',
            description: 'As standard',
          },
        ]}
      />

      <Suspense fallback={t('loading')}>
        <RelatedProducts productId={product.entityId} />
      </Suspense>

      <Suspense fallback={t('loading')}>
        <Reviews productId={product.entityId} />
      </Suspense>
    </>
  );
}

export const runtime = 'edge';
