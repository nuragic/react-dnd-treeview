import React, {
  useImperativeHandle,
  PropsWithChildren,
  ReactElement,
  createContext,
} from "react";
import { useDragDropManager } from "react-dnd";
import {
  mutateTree,
  mutateTreeWithIndex,
  getTreeItem,
  getModifiedIndex,
} from "~/utils";
import { useOpenIdsHelper } from "~/hooks";
import {
  TreeState,
  TreeProps,
  TreeMethods,
  DropOptions,
  NativeSourceDropOptions,
} from "~/types";

type Props<T> = PropsWithChildren<
  TreeProps<T> & {
    treeRef: React.ForwardedRef<TreeMethods>;
  }
>;

export const TreeContext = createContext({});

export const TreeProvider = <T,>(props: Props<T>): ReactElement => {
  const [
    openIds,
    { handleToggle, handleCloseAll, handleOpenAll, handleOpen, handleClose },
  ] = useOpenIdsHelper(props.tree, props.initialOpen);

  useImperativeHandle(props.treeRef, () => ({
    open: (targetIds) => handleOpen(targetIds, props.onChangeOpen),
    close: (targetIds) => handleClose(targetIds, props.onChangeOpen),
    openAll: () => handleOpenAll(props.onChangeOpen),
    closeAll: () => handleCloseAll(props.onChangeOpen),
  }));

  const monitor = useDragDropManager().getMonitor();
  const canDropCallback = props.canDrop;
  const canDragCallback = props.canDrag;

  const value: TreeState<T> = {
    extraAcceptTypes: [],
    listComponent: "ul",
    listItemComponent: "li",
    placeholderComponent: "li",
    sort: true,
    insertDroppableFirst: true,
    dropTargetOffset: 0,
    initialOpen: false,
    ...props,
    openIds,
    onDrop: (dragSource, dropTargetId, index) => {
      const options: DropOptions<T> = {
        dragSourceId: dragSource.id,
        dropTargetId,
        dragSource,
        dropTarget: getTreeItem<T>(props.tree, dropTargetId),
      };

      let tree = props.tree;

      // If the dragSource does not exist in the tree,
      // it is an external node, so add it to the tree
      if (!getTreeItem(tree, dragSource.id)) {
        tree = [...tree, dragSource];
      }

      if (props.sort === false) {
        const [, destIndex] = getModifiedIndex(
          tree,
          dragSource.id,
          dropTargetId,
          index
        );
        options.destinationIndex = destIndex;
        props.onDrop(
          mutateTreeWithIndex<T>(tree, dragSource.id, dropTargetId, index),
          options
        );

        return;
      }

      props.onDrop(mutateTree<T>(tree, dragSource.id, dropTargetId), options);
    },
    onNativeSourceDrop: (dropTargetId, index) => {
      if (props.onNativeSourceDrop) {
        const options: NativeSourceDropOptions<T> = {
          dropTargetId,
          dropTarget: getTreeItem<T>(props.tree, dropTargetId),
        };

        if (props.sort) {
          const [, destIndex] = getModifiedIndex(
            props.tree,
            dropTargetId,
            dropTargetId,
            index
          );
          options.destinationIndex = destIndex;
        }

        props.onNativeSourceDrop(monitor, options);
      }
    },
    canDrop: canDropCallback
      ? (dragSourceId, dropTargetId) =>
          canDropCallback(props.tree, {
            dragSourceId,
            dropTargetId,
            dragSource: monitor.getItem(),
            dropTarget: getTreeItem(props.tree, dropTargetId),
          })
      : undefined,
    canDrag: canDragCallback
      ? (id) => canDragCallback(getTreeItem(props.tree, id))
      : undefined,
    onToggle: (id) => handleToggle(id, props.onChangeOpen),
  };

  return (
    <TreeContext.Provider value={value}>{props.children}</TreeContext.Provider>
  );
};
