import * as t from 'io-ts';
import { RelationshipValues } from './DocumentEditor/component-blocks/utils';
import { RelationshipData } from './DocumentEditor/component-blocks/api';
import { Mark } from './DocumentEditor/utils';
import { excess } from 'io-ts-excess';
// note that this validation isn't about ensuring that a document has nodes in the right positions and things
// it's just about validating that it's a valid slate structure
// we'll then run normalize on it which will enforce more things
const markValue = t.union([t.undefined, t.literal(true)]);

const text = excess(
  t.type({
    text: t.string,
    bold: markValue,
    italic: markValue,
    underline: markValue,
    strikethrough: markValue,
    code: markValue,
    superscript: markValue,
    subscript: markValue,
    keyboard: markValue,
    insertMenu: markValue,
  })
);

type Inline =
  | ({ text: string } & { [Key in Mark | 'insertMenu']: true | undefined })
  | Link
  | Relationship;

type Link = { type: 'link'; href: string; children: Inline[] };

const link: t.Type<Link> = t.recursion('Link', () =>
  excess(
    t.type({
      type: t.literal('link'),
      href: t.string,
      children: inlineChildren,
    })
  )
);

type Relationship = {
  type: 'relationship';
  relationship: string;
  data: RelationshipData | undefined;
  children: Inline[];
};

const relationship: t.Type<Relationship> = t.recursion('Relationship', () =>
  excess(
    t.type({
      type: t.literal('relationship'),
      relationship: t.string,
      data: t.union([t.undefined, relationshipData]),
      children: inlineChildren,
    })
  )
);

const inline = t.union([text, link, relationship]);

const inlineChildren = t.array(inline);

type Children = (Block | Inline)[];

const layoutArea: t.Type<Layout> = t.recursion('Layout', () =>
  excess(
    t.type({
      type: t.literal('layout'),
      layout: t.array(t.number),
      children,
    })
  )
);

type Layout = {
  type: 'layout';
  layout: number[];
  children: Children;
};

const onlyChildrenElements: t.Type<OnlyChildrenElements> = t.recursion('OnlyChildrenElements', () =>
  excess(
    t.type({
      type: t.union([
        t.literal('blockquote'),
        t.literal('layout-area'),
        t.literal('code'),
        t.literal('divider'),
        t.literal('list-item'),
        t.literal('ordered-list'),
        t.literal('unordered-list'),
      ]),
      children,
    })
  )
);

type OnlyChildrenElements = {
  type:
    | 'blockquote'
    | 'layout-area'
    | 'code'
    | 'divider'
    | 'list-item'
    | 'ordered-list'
    | 'unordered-list';
  children: Children;
};

const textAlign = t.union([t.undefined, t.literal('center'), t.literal('end')]);

const heading: t.Type<Heading> = t.recursion('Heading', () =>
  excess(
    t.type({
      type: t.literal('heading'),
      textAlign,
      level: t.union([
        t.literal(1),
        t.literal(2),
        t.literal(3),
        t.literal(4),
        t.literal(5),
        t.literal(6),
      ]),
      children,
    })
  )
);

type Heading = {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  textAlign: 'center' | 'end' | undefined;
  children: Children;
};

type Paragraph = {
  type: 'paragraph';
  textAlign: 'center' | 'end' | undefined;
  children: Children;
};

const paragraph: t.Type<Paragraph> = t.recursion('Paragraph', () =>
  excess(
    t.type({
      type: t.literal('paragraph'),
      textAlign,
      children,
    })
  )
);

const relationshipData: t.Type<RelationshipData> = excess(
  t.type({
    id: t.string,
    label: t.union([t.undefined, t.string]),
    data: t.union([t.undefined, t.record(t.string, t.any)]),
  })
);

type ComponentBlock = {
  type: 'component-block';
  component: string;
  relationships: RelationshipValues;
  props: Record<string, any>;
  children: Children;
};

const relationshipValues: t.Type<RelationshipValues> = t.record(
  t.string,
  t.type({
    relationship: t.string,
    data: t.union([relationshipData, t.readonlyArray(relationshipData), t.null]),
  })
);

const componentBlock: t.Type<ComponentBlock> = t.recursion('ComponentBlock', () =>
  excess(
    t.type({
      type: t.literal('component-block'),
      component: t.string,
      relationships: relationshipValues,
      props: t.record(t.string, t.any),
      children,
    })
  )
);

type ComponentProp = {
  type: 'component-inline-prop' | 'component-block-prop';
  propPath: (string | number)[];
  children: Children;
};

const componentProp: t.Type<ComponentProp> = t.recursion('ComponentProp', () =>
  excess(
    t.type({
      type: t.union([t.literal('component-inline-prop'), t.literal('component-block-prop')]),
      propPath: t.array(t.union([t.string, t.number])),
      children,
    })
  )
);

type Block = Layout | OnlyChildrenElements | Heading | ComponentBlock | ComponentProp | Paragraph;

const block: t.Type<Block> = t.recursion('Element', () =>
  t.union([layoutArea, onlyChildrenElements, heading, componentBlock, componentProp, paragraph])
);

export type ElementFromValidation = Block | Inline;

const children: t.Type<Children> = t.recursion('Children', () => t.array(t.union([block, inline])));

export const editorCodec = t.array(block);

export const validateDocument = (val: unknown) => {
  const result = editorCodec.validate(val, []);
  if (result._tag === 'Left') {
    throw result.left[0];
  }
};
